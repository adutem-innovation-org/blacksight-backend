import { IpData, TempAuthData, UserAgent } from "@/interfaces";
import { AuthData } from "./src/interfaces/auth/auth-data";

declare module "express-serve-static-core" {
  interface Request {
    authData?: AuthData;
    tempAuthData?: TempAuthData;
    ipData?: IpData;
    userAgent?: UserAgent;
    sessionId?: string;
    apiKeyOwnerId?: string;
  }
}
