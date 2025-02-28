import { AuthData } from "./src/interfaces/auth/auth-data";

declare module "express-serve-static-core" {
  interface Request {
    authData?: AuthData;
  }
}
