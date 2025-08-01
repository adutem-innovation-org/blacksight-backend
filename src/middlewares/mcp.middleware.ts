import { throwUnprocessableEntityError } from "@/helpers";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const extractSessionId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.sessionId = req.body.sessionId || req.headers["x-session-id"];
  if (!req.sessionId) {
    return throwUnprocessableEntityError(
      "Unknown session, please provide session id"
    );
  }
  return next();
};
