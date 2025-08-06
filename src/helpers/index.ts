import { UserTypes } from "@/enums";
import { AuthData } from "@/interfaces";
import { logger } from "@/logging";
import { Types } from "mongoose";

export * from "./send-response";
export * from "./throw-request-error";
export * from "./router-creator";
export * from "./provider.helpers";
export * from "./crypto.helpers";
export * from "./pagination.helpers";
export * from "./cleanup.helpers";

export function toBoolean(value: string | boolean | undefined): boolean {
  if (value === undefined) return false;
  return typeof value === "string" ? value === "true" : value;
}

/** Check if the current entity is a user  */
export const isUser = (auth: AuthData) => auth.userType === UserTypes.USER;

/** Check if the current entity is an admin */
export const isAdmin = (auth: AuthData) => auth.userType === UserTypes.ADMIN;

/** Check if the current entity is a super admin */
export const isSuperAdmin = (auth: AuthData) =>
  isAdmin(auth) && auth.isSuperAdmin;

/** Check if the current entity is the owner of the resource in question */
export const isOwner = (auth: AuthData, id: Types.ObjectId) =>
  id.toString() === auth.userId.toString();

export const isOwnerUser = (authData: AuthData, id: Types.ObjectId) =>
  isUser(authData) && isOwner(authData, id);

export const logJsonError = (err: any) => {
  logger.error(JSON.stringify(err, null, 2));
};
