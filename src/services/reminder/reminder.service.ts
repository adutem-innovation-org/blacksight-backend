import { CreateReminderDto } from "@/decorators/reminder";
import { ReminderChannels, ReminderTypes, UserTypes } from "@/enums";
import {
  throwBadRequestError,
  throwForbiddenError,
  throwNotFoundError,
  throwUnprocessableEntityError,
  throwUnsupportedMediaTypeError,
  toBoolean,
} from "@/helpers";
import { AuthData, MiddleWare } from "@/interfaces";
import { IReminder, Reminder } from "@/models";
import { PaginationService } from "@/utils";
import { Model, Types } from "mongoose";
import xlsx from "xlsx";
import fs from "fs";
import csvParser from "csv-parser";
import path from "path";
import { logger } from "@/logging";
import { Logger } from "winston";

export class ReminderService {
  private static instance: ReminderService;
  private readonly reminderModel: Model<IReminder> = Reminder;
  private readonly reminderPaginationService: PaginationService<IReminder>;
  static logger: Logger = logger;
  static middlewares: Record<string, MiddleWare> = {
    parseReminderFile: async (req, res, next) => {
      const file = req.file;

      const { emails, phones } = req.body;

      // Convert bullish string "true" or "false" to Boolean
      const isBulk = toBoolean(req.body.isBulk);
      req.body.isBulk = isBulk;

      if (isBulk) {
        if (emails || phones) return next();
      } else {
        return next();
      }

      if (!file) return throwBadRequestError("No file uploaded.");

      if (!req.body.channel)
        return throwBadRequestError("Reminder channel not specified");

      console.log("Got here", file);

      const fileExt = path.extname(file.originalname).toLowerCase();

      ReminderService.logger.info(`Extracted file extension is:"\n${fileExt}`);

      try {
        let records: any[] = [];

        switch (fileExt) {
          case ".csv":
            {
              await new Promise((resolve, reject) => {
                fs.createReadStream(file.path)
                  .pipe(csvParser())
                  .on("data", (row) => {
                    this.sanitizeAndSaveRow(records, row, req.body.channel);
                  })
                  .on("end", async () => {
                    ReminderService.logger.info(
                      "CSV reminder file successfully parsed"
                    );
                    resolve(true);
                  });
              });
            }
            break;
          case ".xlsx":
          case ".xls":
            {
              const workbook = xlsx.readFile(file.path);
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              const parsed = xlsx.utils.sheet_to_json(sheet);
              parsed.forEach((row) => {
                this.sanitizeAndSaveRow(records, row, req.body.channel);
              });
            }
            break;
          case ".json":
            {
              const raw = fs.readFileSync(file.path, "utf-8");
              const parsed = JSON.parse(raw);
              if (!Array.isArray(parsed))
                return throwUnprocessableEntityError(
                  "JSON must be an array of string."
                );
              parsed.map((row) => {
                this.sanitizeAndSaveRow(records, row, req.body.channel);
              });
            }
            break;
          default:
            return throwUnsupportedMediaTypeError("Unsupported file format.");
        }

        ReminderService.logger.info(
          `Records: \n${JSON.stringify(records, null, 2)}`
        );

        if (records.length === 0)
          return throwUnprocessableEntityError(
            `${
              req.body.channel === ReminderChannels.EMAIL
                ? "Email"
                : "Phone number"
            }s not found in uploaded file `
          );

        // Assign the record to the right field based on the channel
        switch (req.body.channel) {
          case ReminderChannels.EMAIL:
            req.body.emails = records;
            break;
          case ReminderChannels.SMS:
            req.body.phones = records;
            break;
          default:
            break;
        }

        next();
      } catch (error) {
        ReminderService.logger.error(
          typeof error === "string" ? error : JSON.stringify(error, null, 2)
        );
        next(error);
      } finally {
        ReminderService.logger.info("Cleaning up uploaded reminder file.");
        try {
          await fs.promises.unlink(file.path);
        } catch (err: any) {
          console.warn("File deletion failed or already removed:", err.message);
        }
      }
    },
  };

  static validateRecord(record: any, channelType: ReminderChannels) {
    const REQUIRED_FIELD =
      channelType === ReminderChannels.EMAIL ? "email" : "phone";

    // Create a normalized map of the record keys (all lowercase)
    const normalizedKeys = Object.keys(record).reduce((acc, key) => {
      acc[key.toLowerCase()] = record[key];
      return acc;
    }, {} as Record<string, string>);

    // Check for required fields in a case-insensitive manner

    if (!(REQUIRED_FIELD in normalizedKeys)) {
      return {
        valid: false,
        reason: `Missing fields: ${REQUIRED_FIELD}`,
      };
    }

    return { valid: true, record: normalizedKeys[REQUIRED_FIELD] };
  }

  static sanitizeAndSaveRow(
    list: any[],
    row: any,
    channelType: ReminderChannels
  ) {
    const validation = this.validateRecord(row, channelType);
    if (validation.valid) {
      list.push({ data: row });
    } else {
      ReminderService.logger.warn(
        `Invalid row skipped: ${JSON.stringify(row, null, 2)}\nReason: ${
          validation.reason
        }`
      );
    }
  }

  constructor() {
    this.reminderPaginationService = new PaginationService(this.reminderModel);
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ReminderService();
    }
    return this.instance;
  }

  async reminderAnalytics(auth: AuthData) {
    const query = { userId: new Types.ObjectId(auth.userId) };
    const result = await Promise.allSettled([
      this.reminderModel.countDocuments(query).exec(),
      this.reminderModel.countDocuments({ isActive: true, ...query }).exec(),
      this.reminderModel
        .countDocuments({ type: ReminderTypes.PAYMENT, ...query })
        .exec(),
      this.reminderModel
        .countDocuments({ type: ReminderTypes.APPOINTMENT, ...query })
        .exec(),
    ]);

    return {
      data: {
        totalReminders: result[0].status === "fulfilled" ? result[0].value : 0,
        activeReminders: result[1].status === "fulfilled" ? result[1].value : 0,
        paymentReminders:
          result[2].status === "fulfilled" ? result[2].value : 0,
        appointmentReminders:
          result[3].status === "fulfilled" ? result[3].value : 0,
      },
    };
  }

  async createReminder(auth: AuthData, body: CreateReminderDto) {
    const reminder = await this.reminderModel.create({
      userId: auth.userId,
      ...body,
    });
    return { reminder };
  }

  async getReminders(auth: AuthData) {
    return await this.reminderPaginationService.paginate(
      { query: { userId: new Types.ObjectId(auth.userId) } },
      []
    );
  }

  async getReminderById(auth: AuthData, id: string) {
    const reminder = await this.reminderModel.findById(id);
    if (!reminder) return throwNotFoundError("Reminder not found");

    if (
      auth.userType === UserTypes.USER &&
      reminder.userId.toString() !== auth.userId
    )
      return throwForbiddenError("You are not allowed to access this resource");
    return { reminder };
  }

  async deleteReminder(authData: AuthData, id: string) {
    const reminder = await this.reminderModel.findOneAndDelete({
      userId: new Types.ObjectId(authData.userId),
      _id: new Types.ObjectId(id),
    });
    if (!reminder) return throwNotFoundError("Reminder not found");
    return { reminder };
  }
}
