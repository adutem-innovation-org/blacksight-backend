import { NextFunction, Request, Response } from "express";
import { throwUnauthorizedError } from "../helpers";
import { JwtService } from "@/services/auth/jwt.service";
import { CacheService } from "@/utils";
import { AuthData } from "@/interfaces";

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
  req.authData = authData;
  next();
};

export default validateToken;
