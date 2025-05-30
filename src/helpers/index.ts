import { UserTypes } from "@/enums";
import { AuthData } from "@/interfaces";
import { Types } from "mongoose";

export * from "./send-response";
export * from "./throw-request-error";
export * from "./router-creator";

export function toBoolean(value: string) {
  return value === "true";
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
