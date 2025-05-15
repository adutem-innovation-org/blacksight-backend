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

/** Check if the current entity is the owner of the resource in question */
export const isOwner = (auth: AuthData, id: Types.ObjectId) =>
  id.toString() === auth.userId.toString();
