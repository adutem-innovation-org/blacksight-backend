import { NextFunction, Request, Response } from "express";

export * from "./auth";

export interface GenericReq<T> extends Request<any, any, T> {}

export type MiddleWare = (
  req: Request,
  res: Response,
  next: NextFunction
) => any;
