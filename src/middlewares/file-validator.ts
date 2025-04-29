import multer, { FileFilterCallback } from "multer";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { throwBadRequestError } from "@/helpers";

// File filter function (dynamic validation per field)
const fileFilter = (allowedTypes: string[]) => {
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          `Invalid file type for ${
            file.fieldname
          }. Allowed types: ${allowedTypes.join(", ")}`
        )
      );
    }
    cb(null, true);
  };
};

/**
 * Flexible file upload middleware.
 * @param fields Array of field objects with validation rules.
 */
export const uploadFiles = (
  fields: {
    name: string;
    maxCount?: number;
    required?: boolean | ((req: Request) => boolean);
    mimeTypes: string[];
  }[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const multerFields = fields.map((field) => ({
      name: field.name,
      maxCount: field.maxCount || 1,
    }));

    // Configure multer dynamically
    const upload = multer({
      fileFilter: (req, file, cb) => {
        const fieldConfig = fields.find((f) => f.name === file.fieldname);
        if (fieldConfig && fieldConfig.mimeTypes) {
          return fileFilter(fieldConfig.mimeTypes)(req, file, cb);
        }
        cb(new Error(`Unexpected field: ${file.fieldname}`));
      },
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
    }).fields(multerFields);

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError || err) {
        return res
          .status(
            err.message.includes("Invalid file type")
              ? StatusCodes.UNSUPPORTED_MEDIA_TYPE
              : StatusCodes.BAD_REQUEST
          )
          .json({
            message: err.message,
            success: false,
            status: StatusCodes.BAD_REQUEST,
          });
      }

      const reqFiles: Record<string, Express.Multer.File[]> = req.files as any;

      // Manual required field validation
      for (const field of fields) {
        const isRequired =
          typeof field.required === "function"
            ? field.required(req)
            : field.required;

        if (isRequired && (!reqFiles || !reqFiles[field.name])) {
          return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: `Missing required file: ${field.name}` });
        }
      }

      next();
    });
  };
};

export const uploadSingleFile = (options: {
  name: string;
  mimeTypes: string[];
  required?: boolean;
  configs?: object;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const upload = multer({
      fileFilter: (req, file, cb) => {
        return fileFilter(options.mimeTypes)(req, file, cb);
      },
      limits: { fileSize: 20 * 1024 * 1024 },
      ...options.configs,
    }).single(options.name);

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError || err) {
        const statusCode = err.message.includes("Invalid file type")
          ? StatusCodes.UNSUPPORTED_MEDIA_TYPE
          : StatusCodes.BAD_REQUEST;
        return res.status(statusCode).json({ message: err.message }).json({
          message: err.message,
          success: false,
          status: statusCode,
        });
      }

      if (!req.file && options.required)
        return throwBadRequestError(`Missing required file`);
      next();
    });
  };
};
