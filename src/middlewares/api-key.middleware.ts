import { createHash } from "crypto";
import { throwUnauthorizedError } from "@/helpers";
import { Request, Response, NextFunction } from "express";
import { ApiKeyService } from "@/services";

export const verifyApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"];
  const apiKeyService = ApiKeyService.getInstance();

  if (!apiKey || typeof apiKey !== "string") {
    return throwUnauthorizedError("Missing or invalid API key");
  }

  const hashedKey = createHash("sha256").update(apiKey).digest("hex");

  const keyRecord = await apiKeyService.getApiKey(hashedKey);

  if (!keyRecord) {
    return throwUnauthorizedError("Invalid API key");
  }

  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return throwUnauthorizedError("API key has expired");
  }

  // Optionally attach owner to request context
  req.apiKeyOwnerId = keyRecord.ownerId.toString();

  return next();
};
