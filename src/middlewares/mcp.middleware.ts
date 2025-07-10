import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const extractSessionId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.sessionId = req.body.sessionId || req.headers["x-session-id"];
  if (!req.sessionId) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: "Unknown session, please provide session id",
      status: StatusCodes.UNPROCESSABLE_ENTITY,
    });
  }
  next();
};
