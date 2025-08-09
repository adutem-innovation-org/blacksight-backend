import { NextFunction, Request, Response } from "express";

export * from "./auth";
export * from "./appointment";
export * from "./helper.interfaces";
export * from "./reminder";

export interface GenericReq<T> extends Request<any, any, T> {}

export type MiddleWare = (
  req: Request,
  res: Response,
  next: NextFunction
) => any;

export type IpData = {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  long?: number;
};

export type UserAgent = {
  browser: string;
  os: string;
  platform: string;
};
