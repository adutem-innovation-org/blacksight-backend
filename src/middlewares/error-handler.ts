import { StatusCodes, ReasonPhrases } from "http-status-codes";
import {
  createConflictError,
  CustomError,
  CustomErrorInterface,
} from "@/errors";
import { Request, Response, NextFunction } from "express";
import { logger } from "@/logging";

interface ErrorObject {
  status?: number;
  message?: string;
}

// Define a type guard function to check if an object implements CustomErrorInterface
function isCustomError(error: any): error is CustomErrorInterface {
  return typeof error === "object" && "statusCode" in error;
  // Replace 'customProperty' with a property or method that uniquely identifies CustomErrorInterface
}

export const errorHandler = (
  err: CustomErrorInterface | any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let errorObject: ErrorObject = {};

  if (err instanceof CustomError && isCustomError(err)) {
    errorObject.status = err?.statusCode;
    errorObject.message = err.message;
  }
  if (err && err.name === "ValidationError") {
    errorObject.status = StatusCodes.BAD_REQUEST;
    errorObject.message = err.message;
  }
  if (err && err.code === 11000) {
    let message = Object.keys(err.keyValue).join(", ");
    let newConflictError = createConflictError(`${message} already exist`);
    errorObject.status = newConflictError.statusCode;
    errorObject.message = newConflictError.message;
  }
  if (
    err &&
    (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
  ) {
    errorObject.message = /malformed|algorithm/.test(err.message)
      ? "Invalid token"
      : "Session expired";
    errorObject.status = StatusCodes.UNAUTHORIZED;
  }
  if (err && err.name === "CastError") {
    errorObject.message = `${err?.value} is not a valid ${err?.kind}`;
    errorObject.status = StatusCodes.BAD_REQUEST;
  }
  if (err && err.name === "BSONError") {
    errorObject.status = StatusCodes.BAD_REQUEST;
    errorObject.message = err?.message || ReasonPhrases.BAD_REQUEST;
  }
  if (
    err &&
    (err.type === "entity.parse.failed" || err.name === "SyntaxError")
  ) {
    errorObject.status = err?.statusCode || err?.status;
    errorObject.message = err?.message?.includes("JSON")
      ? "Invalid JSON format in the request body. Please ensure there are no trailing commas."
      : "Syntax Error: Invalid data format.";
  }

  if (err && err.name === "MulterError") {
    errorObject.status = StatusCodes.UNPROCESSABLE_ENTITY;
    errorObject.message = `${err?.message} ${err.field}`;
  }

  let status = errorObject?.status || StatusCodes.INTERNAL_SERVER_ERROR;

  logger.error(errorObject?.message || ReasonPhrases.INTERNAL_SERVER_ERROR);

  logger.silly(
    `${JSON.stringify(
      {
        status,
        message: errorObject?.message || ReasonPhrases.INTERNAL_SERVER_ERROR,
        stack: err?.stack,
      },
      undefined,
      2
    )}`
  );

  return res.status(status).json({
    success: false,
    status,
    message: errorObject?.message || ReasonPhrases.INTERNAL_SERVER_ERROR,
  });
};
