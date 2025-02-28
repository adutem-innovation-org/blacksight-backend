import { UserTypes } from "@/enums";
import { Request } from "express";

export interface AuthData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  exp: number;
  pushToken?: string;
  access: string[];
  pin: string;
  authId: string;
  userType: UserTypes;
  isSuperAdmin: boolean;
}
