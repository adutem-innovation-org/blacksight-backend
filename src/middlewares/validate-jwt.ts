import { NextFunction, Request, Response } from "express";
import { throwUnauthorizedError } from "../helpers";
import { JwtService } from "@/services/auth/jwt.service";
import { CacheService } from "@/utils";
import { AuthData, TempAuthData } from "@/interfaces";
import { TTL } from "@/enums";

// export interface ExtendedRequest extends Request {
//   [key: string]: any;
// }

// This middleware is used to validate the token on incoming request
export const validateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const jwtService = new JwtService();
  const cacheService = CacheService.getInstance();
  const token = jwtService.extractTokenFromHeader(req);

  if (!token) return throwUnauthorizedError("Unauthorized");

  // Verify the token with jwt
  let payload = jwtService.verifyToken(token) as { authId: string };
  if (!payload) return throwUnauthorizedError("Malformed Token");

  // Get user authentication data
  const authData = await cacheService.get<AuthData>(payload.authId);
  if (!authData) {
    return throwUnauthorizedError("Invalid token");
  }

  // Check if this is a partial auth token or MFA is required
  if (authData.partialAuth && !authData.mfaVerified)
    return throwUnauthorizedError("MFA verification required");

  req.authData = authData;
  next();
};

export default validateToken;

export const validatePartialToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const jwtService = new JwtService();
  const cacheService = CacheService.getInstance();
  const token = jwtService.extractTokenFromHeader(req);

  if (!token) return throwUnauthorizedError("Unauthorized");

  let payload = jwtService.verifyToken(token) as { tempAuthId: string };
  if (!payload) return throwUnauthorizedError("Malformed Token");

  const tempAuthData = await cacheService.get<TempAuthData>(payload.tempAuthId);
  if (!tempAuthData) {
    return throwUnauthorizedError("Invalid or expired temporary token");
  }

  // Check if temp token is expired (15 minutes)
  if (Date.now() - tempAuthData.loginTime > TTL.IN_15_MINUTES * 1000) {
    await cacheService.delete(payload.tempAuthId);
    return throwUnauthorizedError("Temporary token expired");
  }

  req.tempAuthData = tempAuthData;
  req.body.tempToken = token;
  next();
};
