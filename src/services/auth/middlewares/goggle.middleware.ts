import { NextFunction, Request, Response } from "express";
import { GoogleAuth } from "../google";
import {
  throwBadRequestError,
  throwForbiddenError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { logger } from "@/logging";

export const googleLoginMiddleware = () => {
  const googleAuth = new GoogleAuth();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, accessToken } = req.body;
      if (!email || !accessToken)
        return throwBadRequestError("Email and access token are required");
      // const tokenPayload = await googleAuth.fetchTokenInfo(accessToken);
      const tokenPayload = await googleAuth.validateAccessToken(accessToken);
      if (!tokenPayload) return throwForbiddenError("Invalid access token");
      if (
        String(tokenPayload.email).toLowerCase() !== String(email).toLowerCase()
      ) {
        return throwUnprocessableEntityError(
          "Could not validate your account with Google servers"
        );
      }
      next();
    } catch (error: any) {
      console.log(error);
      logger.log(error);
      throwUnprocessableEntityError(
        "Could not validate your account with Google servers"
      );
    }
  };
};
