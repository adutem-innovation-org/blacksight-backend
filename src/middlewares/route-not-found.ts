import { Request, Response } from "express";
import { throwNotFoundError } from "@/helpers";

export const routeNotFound = (req: Request, res: Response) => {
  throwNotFoundError(`${req.url} does not exist`);
};
