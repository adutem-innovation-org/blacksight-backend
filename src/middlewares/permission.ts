import { throwUnauthorizedError, throwForbiddenError } from "../helpers";
import { Request, Response, NextFunction } from "express";
import { UserTypes } from "@/enums";

interface ExtendedRequest extends Request {
  [key: string]: any;
}

export const permissionRequirement = (allowedUserTypes: UserTypes[] = []) => {
  return (req: ExtendedRequest, res: Response, next: NextFunction) => {
    if (req.authData) {
      if (
        allowedUserTypes?.length &&
        !allowedUserTypes.includes(req.authData.userType)
      )
        throwForbiddenError("Forbidden");
      return next();
    }
    throwUnauthorizedError("Unauthorized");
  };
};

export const adminAccess =
  (superAdminOnly = false) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.authData?.userType !== UserTypes.ADMIN)
      return throwForbiddenError("Forbidden");
    if (superAdminOnly && !req.authData?.isSuperAdmin)
      return throwForbiddenError("Forbidden");
    return next();
  };
