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

  // For mfa setup
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
  partialAuth?: boolean;
}

export interface TempAuthData {
  userId: string;
  email: string;
  loginTime: number;
  expiresAt: number;
  mfaRequired: boolean;
}
