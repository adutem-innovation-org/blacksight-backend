import { createHash } from "crypto";
import { throwUnauthorizedError } from "@/helpers";
import { Request, Response, NextFunction } from "express";
import { ApiKeyService } from "@/services";
import { User } from "@/models";
import { GetUserAltDto } from "@/decorators";
import _ from "lodash";
import { AuthData } from "@/interfaces";
import { CacheService } from "@/utils";
import { config } from "@/config";
import { TTL } from "@/enums";

export const verifyApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    return throwUnauthorizedError("Missing or invalid API key");
  }

  const apiKeyService = ApiKeyService.getInstance();
  const cacheService = CacheService.getInstance();
  const hashedKey = createHash("sha256").update(apiKey).digest("hex");

  const cached = await cacheService.get<AuthData>(hashedKey);

  // Check if all the required data is in cache and proceed accordingly
  if (cached) {
    req.authData = cached;
    req.apiKeyOwnerId = cached.userId;
    return next();
  }

  console.log("Hashed key", hashedKey);

  const keyRecord = await apiKeyService.getApiKey(hashedKey);

  console.log("Key record", keyRecord);

  if (
    !keyRecord ||
    keyRecord.revoked ||
    keyRecord.disabled ||
    (keyRecord.expiresAt && keyRecord.expiresAt < new Date())
  ) {
    return throwUnauthorizedError("Invalid API key");
  }

  // Obscure real reason for security purposes
  // if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
  //   return throwUnauthorizedError("API key has expired");
  // }

  // if (keyRecord.disabled || keyRecord.revoked) {
  //   return throwUnauthorizedError("API key is disabled or revoked");
  // }

  // Optionally attach owner to request context
  req.apiKeyOwnerId = keyRecord.ownerId.toString();

  // Get user info
  const user = await User.findById(req.apiKeyOwnerId!).select(GetUserAltDto);

  console.log("Api key owner >> ", user);

  if (!user || user.isSuspended) {
    return throwUnauthorizedError("Invalid API key");
  }

  const {
    _id,
    businessId,
    email,
    firstName,
    lastName,
    isSuperAdmin,
    userType,
  } = user;

  // Create a cache for record for the hashed key
  let authData = await cacheService.get<AuthData>(hashedKey);

  if (!authData) {
    authData = {
      userId: _id.toString(),
      businessId,
      email,
      firstName,
      lastName,
      userType,
      isSuperAdmin,
      exp: Date.now() / 1000 + TTL.IN_10_MINUTES,
      access: [],
      authId: `auth-id-${hashedKey}`,
    };
  }

  await cacheService.set(hashedKey, authData, TTL.IN_10_MINUTES);

  req.authData = authData;

  return next();
};
