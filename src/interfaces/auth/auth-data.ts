import { UserTypes } from "@/enums";
import { Request } from "express";

export interface AuthData {
  userId: string;
  businessId: string;
  email: string;
  firstName: string;
  lastName: string;
  exp: number;
  pushToken?: string;
  access: string[];
  authId: string;
  userType: UserTypes;
  isSuperAdmin: boolean;
}
