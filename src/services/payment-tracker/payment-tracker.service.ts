import {
  CreatePaymentFileDto,
  UpdateBCPDto,
  UpdatePaymentFileDto,
} from "@/decorators";
import { PaymentInterval, ReminderChannels, UserTypes } from "@/enums";
import {
  isOwnerUser,
  isSuperAdmin,
  throwBadRequestError,
  throwForbiddenError,
  throwNotFoundError,
  throwUnprocessableEntityError,
  throwUnsupportedMediaTypeError,
  logJsonError,
  toBoolean,
} from "@/helpers";
import { AuthData, MiddleWare } from "@/interfaces";
import { logger } from "@/logging";
import {
  IBusinessCustomerPayment,
  BusinessCustomerPayment,
  IPaymentFile,
  PaymentFile,
} from "@/models";
import { PaginationService, StorageService } from "@/utils";
import { Model, Types } from "mongoose";
import { Logger } from "winston";
import xlsx from "xlsx";
import fs from "fs";
import csvParser from "csv-parser";
import path from "path";

export class PaymentTrackerService {
  private static instance: PaymentTrackerService;

  private static readonly logJsonError = logJsonError;
  private static readonly logger: Logger = logger;

  private readonly paymentFileModel: Model<IPaymentFile> = PaymentFile;
  private readonly businessCustomerPaymentModel: Model<IBusinessCustomerPayment> =
    BusinessCustomerPayment;

  private readonly paymentFilePagination: PaginationService<IPaymentFile>;
  private readonly bcpPagination: PaginationService<IBusinessCustomerPayment>;
  private readonly storageService: StorageService;

  static middlewares: Record<
    "parsePaymentFile" | "extractBCPFromFile",
    MiddleWare
  > = {
    parsePaymentFile: async (req, res, next) => {
      const file = req.file;

      if (!file) return throwBadRequestError("No file uploaded.");

      const fileExt = path.extname(file.originalname).toLowerCase();

      PaymentTrackerService.logger.info(
        `Processing payment file with extension: ${fileExt}`
      );

      try {
        let records: any[] = [];

        switch (fileExt) {
          case ".csv":
            {
              await new Promise((resolve, reject) => {
                fs.createReadStream(file.path)
                  .pipe(csvParser())
                  .on("data", (row) => {
                    PaymentTrackerService.sanitizeAndValidateRow(records, row);
                  })
                  .on("end", () => {
                    PaymentTrackerService.logger.info(
                      "CSV payment file successfully parsed"
                    );
                    resolve(true);
                  })
                  .on("error", reject);
              });
            }
            break;
          case ".xlsx":
          case ".xls":
            {
              const workbook = xlsx.readFile(file.path);
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              const parsed = xlsx.utils.sheet_to_json(sheet, {
                raw: false,
                dateNF: "mm/dd/yyyy",
              });
              console.log("parsed", parsed);
              parsed.forEach((row) => {
                PaymentTrackerService.sanitizeAndValidateRow(records, row);
              });
            }
            break;
          default:
            return throwUnsupportedMediaTypeError("Unsupported file format.");
        }

        PaymentTrackerService.logger.info(
          `Processed ${records.length} valid records from payment file`
        );

        if (records.length === 0) {
          return throwUnprocessableEntityError(
            "No valid payment records found in uploaded file"
          );
        }

        req.body.paymentRecords = records;
        next();
      } catch (error) {
        PaymentTrackerService.logger.error(
          "Error processing payment file:",
          error
        );
        next(error);
      } finally {
        // Don't uncomment unless you stop file storage to firebase
        // PaymentTrackerService.logger.info(
        //   "Cleaning up uploaded reminder file."
        // );
        // try {
        //   await fs.promises.access(file.path);
        //   PaymentTrackerService.logger.info(
        //     "File exist, will proceed to clean up..."
        //   );
        //   await fs.promises.unlink(file.path);
        // } catch (err: any) {
        //   PaymentTrackerService.logger.warn(
        //     "File deletion failed or already removed:",
        //     err.message
        //   );
        // }
      }
    },

    extractBCPFromFile: async (req, res, next) => {
      try {
        const { fileId, channel } = req.body;

        if (!fileId) {
          return next(throwBadRequestError("Please select a payment file."));
        }

        if (!Types.ObjectId.isValid(fileId)) {
          return next(throwBadRequestError("Invalid file ID format."));
        }

        // Build projection based on channel
        let projectStage = {};
        switch (channel) {
          case ReminderChannels.BOTH:
            projectStage = { email: 1, phone: 1 };
            break;
          case ReminderChannels.EMAIL:
            projectStage = { email: 1 };
            break;
          case ReminderChannels.SMS:
            projectStage = { phone: 1 };
            break;
          default:
            return next(
              throwBadRequestError("Please specify a valid reminder channel.")
            );
        }

        const result = await BusinessCustomerPayment.aggregate([
          { $match: { fileId: new Types.ObjectId(fileId) } },
          { $project: projectStage },
          {
            $group: {
              _id: null,
              emails: {
                $addToSet: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$email", null] },
                        { $ne: ["$email", ""] },
                      ],
                    },
                    "$email",
                    "$$REMOVE",
                  ],
                },
              },
              phones: {
                $addToSet: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$phone", null] },
                        { $ne: ["$phone", ""] },
                      ],
                    },
                    "$phone",
                    "$$REMOVE",
                  ],
                },
              },
            },
          },
        ]);

        if (!result.length) {
          return next(
            throwBadRequestError("No records found for the specified file.")
          );
        }

        if (
          result[0].emails.length === 0 &&
          result[0].phones.length === 0 &&
          channel === ReminderChannels.BOTH
        ) {
          return next(
            throwBadRequestError(
              "No email or phone records found for the specified file."
            )
          );
        }

        if (
          result[0].emails.length === 0 &&
          [ReminderChannels.EMAIL, ReminderChannels.BOTH].includes(channel)
        ) {
          return next(
            throwBadRequestError(
              "No email records found for the specified file. Consider using a different channel."
            )
          );
        }

        if (
          result[0].phones.length === 0 &&
          [ReminderChannels.SMS, ReminderChannels.BOTH].includes(channel)
        ) {
          return next(
            throwBadRequestError(
              "No phone records found for the specified file. Consider using a different channel."
            )
          );
        }

        req.body.emails = result[0].emails || [];
        req.body.phones = result[0].phones || [];
        next();
      } catch (error) {
        next(error);
      }
    },
  };

  constructor() {
    this.paymentFilePagination = new PaginationService(this.paymentFileModel);
    this.bcpPagination = new PaginationService(
      this.businessCustomerPaymentModel
    );
    this.storageService = StorageService.getInstance();
  }

  static getInstance(): PaymentTrackerService {
    if (!this.instance) {
      this.instance = new PaymentTrackerService();
    }
    return this.instance;
  }

  // Helper function to find column by multiple possible names
  private static findColumnValue(record: any, possibleNames: string[]): any {
    for (const name of possibleNames) {
      // Try exact match first
      if (record[name] !== undefined) {
        return record[name];
      }

      // Try case-insensitive match
      const recordKeys = Object.keys(record);
      const matchingKey = recordKeys.find(
        (key) => key.toLowerCase() === name.toLowerCase()
      );

      if (matchingKey && record[matchingKey] !== undefined) {
        return record[matchingKey];
      }
    }
    return undefined;
  }

  private static validatePaymentRecord(record: any) {
    // Define possible column name variations for each required field
    const fieldVariations = {
      name: [
        "name",
        "Name",
        "NAME",
        "full name",
        "Full Name",
        "FULL NAME",
        "FULL_NAME",
        "full_name",
        "student name",
        "Student Name",
        "STUDENT NAME",
        "STUDENT_NAME",
        "student_name",
      ],
      email: [
        "email",
        "Email",
        "EMAIL",
        "E-MAIL",
        "e-mail",
        "E-mail",
        "email address",
        "Email Address",
        "EMAIL ADDRESS",
        "EMAIL_ADDRESS",
        "email_address",
      ],
      phone: [
        "phone",
        "Phone",
        "PHONE",
        "phone number",
        "Phone Number",
        "PHONE NUMBER",
        "PHONE_NUMBER",
        "phone_number",
        "mobile",
        "Mobile",
        "MOBILE",
        "contact",
        "Contact",
        "CONTACT",
      ],
      paymentInterval: [
        "paymentInterval",
        "PaymentInterval",
        "PAYMENTINTERVAL",
        "PAYMENT_INTERVAL",
        "payment_interval",
        "payment interval",
        "Payment Interval",
        "PAYMENT INTERVAL",
        "interval",
        "Interval",
        "INTERVAL",
        "frequency",
        "Frequency",
        "FREQUENCY",
      ],
      lastPayment: [
        "lastPayment",
        "LastPayment",
        "LASTPAYMENT",
        "LAST_PAYMENT",
        "last_payment",
        "last payment",
        "Last Payment",
        "LAST PAYMENT",
        "payment date",
        "Payment Date",
        "PAYMENT DATE",
        "PAYMENT_DATE",
        "payment_date",
        "date",
        "Date",
        "DATE",
      ],
    };

    // Extract values using flexible matching
    const extractedValues = {
      name: PaymentTrackerService.findColumnValue(record, fieldVariations.name),
      email: PaymentTrackerService.findColumnValue(
        record,
        fieldVariations.email
      ),
      phone: PaymentTrackerService.findColumnValue(
        record,
        fieldVariations.phone
      ),
      paymentInterval: PaymentTrackerService.findColumnValue(
        record,
        fieldVariations.paymentInterval
      ),
      lastPayment: PaymentTrackerService.findColumnValue(
        record,
        fieldVariations.lastPayment
      ),
    };

    // Check for required fields (name, email, paymentInterval, lastPayment)
    const requiredFields = ["name", "email", "paymentInterval", "lastPayment"];
    const missingFields = requiredFields.filter(
      (field) =>
        extractedValues[field as keyof typeof extractedValues] === undefined ||
        extractedValues[field as keyof typeof extractedValues] === null ||
        extractedValues[field as keyof typeof extractedValues] === ""
    );

    if (missingFields.length > 0) {
      // Log the available columns for debugging
      const availableColumns = Object.keys(record).join(", ");
      PaymentTrackerService.logger.warn(
        `Missing required fields: ${missingFields.join(
          ", "
        )}. Available columns: ${availableColumns}`
      );

      return {
        valid: false,
        reason: `Missing required fields: ${missingFields.join(", ")}`,
      };
    }

    // Validate payment interval with flexible matching
    const paymentInterval = extractedValues.paymentInterval;
    const normalizedInterval =
      typeof paymentInterval === "string"
        ? paymentInterval.toLowerCase()
        : paymentInterval;

    // Create a mapping for common interval variations
    const intervalMapping = {
      monthly: "Monthly",
      annually: "Annually",
      yearly: "Annually",
      quarterly: "Quarterly",
      weekly: "Weekly",
      daily: "Daily",
      annual: "Annually",
      month: "Monthly",
      year: "Annually",
      quarter: "Quarterly",
      week: "Weekly",
      day: "Daily",
    };

    const mappedInterval =
      intervalMapping[normalizedInterval as keyof typeof intervalMapping] ||
      paymentInterval;

    if (!Object.values(PaymentInterval).includes(mappedInterval)) {
      return {
        valid: false,
        reason: `Invalid payment interval: ${paymentInterval}. Expected one of: ${Object.values(
          PaymentInterval
        ).join(", ")}`,
      };
    }
    // Validate date format
    const lastPaymentValue = extractedValues.lastPayment;
    const lastPayment = new Date(lastPaymentValue);
    if (isNaN(lastPayment.getTime())) {
      return {
        valid: false,
        reason: `Invalid last payment date format: ${lastPaymentValue}`,
      };
    }

    return {
      valid: true,
      record: {
        name: extractedValues.name,
        email: extractedValues.email,
        phone: extractedValues.phone || undefined,
        paymentInterval: mappedInterval,
        lastPayment,
      },
    };
  }

  private static sanitizeAndValidateRow(list: any[], row: any) {
    console.log("row", row);
    const validation = this.validatePaymentRecord(row);
    if (validation.valid) {
      list.push(validation.record);
    } else {
      PaymentTrackerService.logger.warn(
        `Invalid payment record skipped: ${JSON.stringify(
          row,
          null,
          2
        )}\nReason: ${validation.reason}`
      );
    }
  }

  private computeNextPaymentDate(
    lastPayment: Date,
    interval: PaymentInterval
  ): Date {
    const nextPayment = new Date(lastPayment);

    switch (interval) {
      case PaymentInterval.DAILY:
        nextPayment.setDate(nextPayment.getDate() + 1);
        break;
      case PaymentInterval.WEEKLY:
        nextPayment.setDate(nextPayment.getDate() + 7);
        break;
      case PaymentInterval.MONTHLY:
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        break;
      case PaymentInterval.QUARTERLY:
        nextPayment.setMonth(nextPayment.getMonth() + 3);
        break;
      case PaymentInterval.ANNUALLY:
        nextPayment.setFullYear(nextPayment.getFullYear() + 1);
        break;
      default:
        throw new Error(`Unsupported payment interval: ${interval}`);
    }

    return nextPayment;
  }

  private formatFileSize(size: number) {
    const kilobyte = 1024;
    const megabyte = kilobyte * 1024;
    const gigabyte = megabyte * 1024;

    if (size < kilobyte) return `${size} bytes`;
    else if (size < megabyte) return `${(size / kilobyte).toFixed(2)} KB`;
    else if (size < gigabyte) return `${(size / megabyte).toFixed(2)} MB`;
    else return `${(size / gigabyte).toFixed(2)} GB`;
  }

  async uploadPaymentFile(
    auth: AuthData,
    body: CreatePaymentFileDto,
    file: Express.Multer.File
  ) {
    const userId = auth.userId;

    try {
      // Upload file to storage
      const ext = path.extname(file.originalname).toLowerCase().substring(1);
      const location = `payment-files/${userId}_${Date.now()}.${ext}`;
      const { fileUrl } = await this.storageService.uploadFile(file, location);

      // Create payment file record
      const paymentFile = await this.paymentFileModel.create({
        userId: new Types.ObjectId(userId),
        tag: body.tag || file.originalname,
        fileUrl,
        metaData: {
          originalName: file.originalname,
          size: this.formatFileSize(file.size),
          mimeType: file.mimetype,
          uploadDate: new Date(),
          recordCount: body.paymentRecords?.length || 0,
        },
      });

      // Process payment records if they exist (from middleware)
      if (body.paymentRecords && body.paymentRecords.length > 0) {
        const bcpRecords = body.paymentRecords.map((record: any) => ({
          userId,
          fileId: paymentFile._id,
          ...record,
          nextPayment: this.computeNextPaymentDate(
            record.lastPayment,
            record.paymentInterval
          ),
        }));

        await this.businessCustomerPaymentModel.insertMany(bcpRecords);

        // Update metadata with actual record count
        paymentFile.metaData.set("recordCount", bcpRecords.length);
        await paymentFile.save();
      }

      return {
        paymentFile,
        message: "Payment file uploaded and processed successfully",
      };
    } catch (error: any) {
      PaymentTrackerService.logger.error(
        "Error uploading payment file:",
        error
      );
      throw error;
    } finally {
      // Clean up uploaded file
      try {
        if (file && file.path) {
          await fs.promises.unlink(file.path);
        }
      } catch (err: any) {
        console.warn("File cleanup failed or already removed:", err.message);
      }
    }
  }

  async getAllPaymentFiles(auth: AuthData) {
    let query: Record<string, any> = {};
    const populate = ["uploadedBy"];

    if (auth.userType === UserTypes.USER) {
      query.userId = new Types.ObjectId(auth.userId);
    }

    return await this.paymentFilePagination.paginate(
      {
        query,
        populate,
        sort: { updatedAt: -1 },
      },
      []
    );
  }

  async getPaymentFileById(auth: AuthData, id: string) {
    const paymentFile = await this.paymentFileModel.findById(id);

    if (!paymentFile) return throwNotFoundError("Payment file not found");

    if (
      auth.userType === UserTypes.USER &&
      paymentFile.userId.toString() !== auth.userId
    ) {
      return throwForbiddenError("You are not allowed to access this resource");
    }

    return { paymentFile };
  }

  async deletePaymentFile(auth: AuthData, id: string) {
    const paymentFile = await this.paymentFileModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(auth.userId),
    });

    if (!paymentFile) return throwNotFoundError("Payment file not found");

    try {
      // Delete associated BCP records
      await this.businessCustomerPaymentModel.deleteMany({
        fileId: new Types.ObjectId(id),
      });

      await this.storageService.deleteFile(paymentFile.fileUrl);
    } catch (error) {
      PaymentTrackerService.logger.error(
        "Error during payment file cleanup:",
        error
      );
      PaymentTrackerService.logJsonError(error);
    }

    return {
      paymentFile,
      message: "Payment file and associated records deleted successfully",
    };
  }

  async updatePaymentFile(
    auth: AuthData,
    id: string,
    body: UpdatePaymentFileDto,
    file: Express.Multer.File
  ) {
    const paymentFile = await this.paymentFileModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(auth.userId),
    });

    if (!paymentFile) return throwNotFoundError("Payment file not found");

    const insertNew = toBoolean(body.insertNew);

    try {
      // Upload new file
      const ext = path.extname(file.originalname).toLowerCase().substring(1);
      const location = `payment-files/${auth.userId}_${Date.now()}.${ext}`;
      const result = await this.storageService.uploadFile(file, location);

      // Update payment file
      paymentFile.fileUrl = result.fileUrl;
      paymentFile.metaData.set("originalName", file.originalname);
      paymentFile.metaData.set("size", this.formatFileSize(file.size));
      paymentFile.metaData.set("mimeType", file.mimetype);
      paymentFile.metaData.set("lastUpdate", new Date());

      if (body.paymentRecords && body.paymentRecords.length > 0) {
        if (insertNew) {
          // Insert new records and update existing ones
          const bulkOps = body.paymentRecords.map((record: any) => ({
            updateOne: {
              filter: {
                fileId: paymentFile._id,
                $or: [
                  { email: record.email },
                  ...(record.phone ? [{ phone: record.phone }] : []),
                ],
              },
              update: {
                $set: {
                  ...record,
                  userId: new Types.ObjectId(auth.userId),
                  nextPayment: this.computeNextPaymentDate(
                    record.lastPayment,
                    record.paymentInterval
                  ),
                },
              },
              upsert: true,
            },
          }));

          await this.businessCustomerPaymentModel.bulkWrite(bulkOps);
        } else {
          // Only update existing records
          for (const record of body.paymentRecords) {
            await this.businessCustomerPaymentModel.updateMany(
              {
                fileId: paymentFile._id,
                $or: [
                  { email: record.email },
                  ...(record.phone ? [{ phone: record.phone }] : []),
                ],
              },
              {
                $set: {
                  ...record,
                  user: new Types.ObjectId(auth.userId),
                  nextPayment: this.computeNextPaymentDate(
                    record.lastPayment,
                    record.paymentInterval
                  ),
                },
              }
            );
          }
        }

        paymentFile.metaData.set("recordCount", body.paymentRecords.length);
      }

      await paymentFile.save();

      return {
        paymentFile,
        message: "Payment file updated successfully",
      };
    } catch (error: any) {
      PaymentTrackerService.logger.error("Error updating payment file:", error);
      throw error;
    } finally {
      // Clean up uploaded file
      try {
        if (file && file.path) {
          await fs.promises.unlink(file.path);
        }
      } catch (err: any) {
        console.warn("File cleanup failed or already removed:", err.message);
      }
    }
  }

  async getPaymentFileBCPs(auth: AuthData, fileId: string) {
    // Verify file ownership
    const paymentFile = await this.paymentFileModel.findOne({
      _id: new Types.ObjectId(fileId),
      userId: new Types.ObjectId(auth.userId),
    });

    if (!paymentFile) return throwNotFoundError("Payment file not found");

    return await this.bcpPagination.paginate(
      {
        query: { fileId: new Types.ObjectId(fileId) },
        sort: { updatedAt: -1 },
      },
      []
    );
  }

  async getBCPById(auth: AuthData, id: string) {
    const bcp = await this.businessCustomerPaymentModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(auth.userId),
      })
      .populate({
        path: "fileId",
        model: "payment-files",
      });

    if (!bcp) return throwNotFoundError("Business customer payment not found");

    // Check ownership through payment file
    const paymentFile = bcp.fileId as any;
    if (
      auth.userType === UserTypes.USER &&
      paymentFile.userId.toString() !== auth.userId
    ) {
      return throwForbiddenError("You are not allowed to access this resource");
    }

    return { bcp };
  }

  async updateBCP(auth: AuthData, id: string, body: UpdateBCPDto) {
    const bcp = await this.businessCustomerPaymentModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(auth.userId),
      })
      .populate({
        path: "fileId",
        model: "payment-files",
      });

    if (!bcp) return throwNotFoundError("Business customer payment not found");

    // Check ownership through payment file
    const paymentFile = bcp.fileId as any;
    if (
      auth.userType === UserTypes.USER &&
      paymentFile.userId.toString() !== auth.userId
    ) {
      return throwForbiddenError("You are not allowed to access this resource");
    }

    // Update fields
    Object.assign(bcp, body);

    // Recompute next payment if interval or last payment changed
    if (body.paymentInterval || body.lastPayment) {
      bcp.nextPayment = this.computeNextPaymentDate(
        bcp.lastPayment,
        bcp.paymentInterval
      );
    }

    await bcp.save();

    return {
      bcp,
      message: "Business customer payment updated successfully",
    };
  }

  async deleteBCP(auth: AuthData, id: string) {
    const bcp = await this.businessCustomerPaymentModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(auth.userId),
      })
      .populate({
        path: "fileId",
        model: "payment-files",
      });

    if (!bcp) return throwNotFoundError("Business customer payment not found");

    // Check ownership through payment file
    const paymentFile = bcp.fileId as any;
    if (
      auth.userType === UserTypes.USER &&
      paymentFile.userId.toString() !== auth.userId
    ) {
      return throwForbiddenError("You are not allowed to access this resource");
    }

    await this.businessCustomerPaymentModel.findByIdAndDelete(id);

    return {
      bcp,
      message: "Business customer payment deleted successfully",
    };
  }
}
