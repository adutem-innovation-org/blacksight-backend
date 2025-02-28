import { logger } from "@/logging";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NextFunction, Request, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

export function validateDTO(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dto = plainToInstance(dtoClass, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const errorObj: Record<string, string> = {};

      for (let err of errors) {
        errorObj[err.property] = Object.values(err.constraints || [])[0];
      }

      logger.error(`${JSON.stringify(errors, undefined, 2)}`);

      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: ReasonPhrases.BAD_REQUEST,
        errors: errorObj,
      });

      return;
    }
    next();
  };
}
