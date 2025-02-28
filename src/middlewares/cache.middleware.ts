import { sendSuccessResponse } from "@/helpers";
import { NextFunction, Request, Response } from "express";
import { logger } from "@/logging";
import { CacheService } from "@/utils";
import { CacheKeys } from "@/enums";

export const cacheMiddleware = (key: CacheKeys, ttl: number) => {
  const cacheService = CacheService.getInstance();
  return async (req: Request, res: any, next: NextFunction) => {
    try {
      const cachedResponse = await cacheService.get(key);
      if (cachedResponse) {
        if (Array.isArray(cachedResponse)) {
          if (cachedResponse.length !== 0) {
            return sendSuccessResponse(res, { data: cachedResponse });
          }
        } else {
          return sendSuccessResponse(res, { data: cachedResponse });
        }
      }
      res.sendResponse = res.json;
      res.json = async (body: any) => {
        await cacheService.set(key, body.data, ttl);
        res.sendResponse(body);
      };
      next();
    } catch (error: any) {
      logger.error(`Cache Middlware error: ${error}}`);
      next();
    }
  };
};
