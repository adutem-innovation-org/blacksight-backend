import { randomBytes, webcrypto } from "crypto";
import {
  CacheService,
  MailgunEmailService,
  TwilioMessagingService,
} from "@/utils";
import { Model } from "mongoose";
import { IMFASetup, IUser, MFASetup, User } from "@/models";
import { MFAMethods, TTL } from "@/enums";
import { throwUnprocessableEntityError } from "@/helpers";
import { IpData, UserAgent } from "@/interfaces";

export class MFAService {
  private static cacheService = CacheService.getInstance();

  private static smsService = TwilioMessagingService.getInstance();
  private static emailService = MailgunEmailService.getInstance();

  private static mfaSetupModel: Model<IMFASetup> = MFASetup;
  private static userModel: Model<IUser> = User;

  // Initialize MFA setup with backup codes (called automatically when needed)
  private static async ensureMFASetup(userId: string): Promise<IMFASetup> {
    let mfaSetup = await this.mfaSetupModel.findOne({ userId });

    if (!mfaSetup) {
      const backupCodes = this.generateBackupCodes();
      mfaSetup = await this.mfaSetupModel.create({
        userId,
        backupCodes,
        enabled: false,
        emailEnabled: false,
        smsEnabled: false,
      });
    }

    return mfaSetup;
  }

  // static async generateMFASetup(userId: string) {
  //   const backupCodes = this.generateBackupCodes();

  //   // Create or update database for mfa setup
  //   await this.mfaSetupModel.findOneAndUpdate(
  //     { userId },
  //     {
  //       userId,
  //       backupCodes,
  //       enabled: false,
  //       emailEnabled: false,
  //       smsEnabled: false,
  //     },
  //     { upsert: true }
  //   );

  //   return { backupCodes };
  // }

  // Generate and send verification code
  static async sendVerificationCode(
    userId: string,
    method: MFAMethods,
    ipData?: IpData,
    userAgent?: UserAgent
  ) {
    try {
      const code = this.generateVerificationCode();
      const cache_key = `mfa_code::${userId}:${method}`;

      // Store code in redis with 10-minute expiration;
      await this.cacheService.set(cache_key, code, TTL.IN_10_MINUTES);

      const mfaSetup = await this.mfaSetupModel.findOne({ userId });
      if (!mfaSetup) return false;

      switch (method) {
        case MFAMethods.EMAIL:
          // TODO: Send email
          const { email, firstName } = await this.getUserData(userId);
          await this.emailService.send({
            template: "mfa-code",
            message: {
              to: email,
              subject: "Verify Blacksight login",
            },
            locals: {
              firstName,
              verificationCode: code,
              timestamp: new Date().toUTCString(),
              ipAddress: ipData?.ip,
              location: `${ipData?.city}, ${ipData?.region}, ${ipData?.country}`,
              device: `${userAgent?.os} ${userAgent?.browser} on ${userAgent?.platform}`,
            },
          });
          break;
        case MFAMethods.SMS:
          // TODO: Send SMS
          if (mfaSetup.phoneNumber) {
            await this.smsService.send({
              body: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
              to: mfaSetup.phoneNumber,
            });
          }
          break;
        default:
          return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Verify email/sms code
  static async verifyCode(userId: string, code: string, method: MFAMethods) {
    try {
      const cacheKey = `mfa_code::${userId}:${method}`;
      const storedCode = await this.cacheService.get<string>(cacheKey);

      if (!storedCode || storedCode !== code) {
        return false;
      }

      // Delete the code after successful verification
      await this.cacheService.delete(cacheKey);
      return true;
    } catch (error) {
      console.error("Failed to verify code:", error);
      return false;
    }
  }

  // Verify backup code
  static async verifyBackupCode(userId: string, code: string) {
    const mfaSetup = await this.mfaSetupModel.findOne({
      userId,
      enabled: true,
    });
    if (!mfaSetup) return false;

    const codeIndex = mfaSetup.backupCodes.indexOf(code.toUpperCase());
    if (codeIndex === -1) return false;

    // Remove used backup code
    mfaSetup.backupCodes.splice(codeIndex, 1);

    await mfaSetup.save();

    return true;
  }

  // Enable specific MFA method
  // static async enableMFAMethod(
  //   userId: string,
  //   method: MFAMethods,
  //   phoneNumber?: string
  // ): Promise<boolean> {
  //   const updateData: any = { enabled: true };

  //   switch (method) {
  //     case MFAMethods.EMAIL:
  //       updateData.emailEnabled = true;
  //       break;
  //     case MFAMethods.SMS:
  //       if (!phoneNumber) return false;
  //       updateData.smsEnabled = true;
  //       updateData.phoneNumber = true;
  //       break;
  //     default:
  //       break;
  //   }

  //   const result = await this.mfaSetupModel.findOneAndUpdate(
  //     { userId },
  //     updateData,
  //     { new: true }
  //   );

  //   return !!result;
  // }
  static async enableMFAMethod(
    userId: string,
    method: MFAMethods,
    phoneNumber?: string
  ): Promise<{ success: boolean; backupCodes?: string[] }> {
    // Ensure MFA setup exists (creates backup codes automatically)
    const mfaSetup = await this.ensureMFASetup(userId);

    const updateData: any = { enabled: true };
    let isFirstMethod = !mfaSetup.emailEnabled && !mfaSetup.smsEnabled;

    switch (method) {
      case MFAMethods.EMAIL:
        updateData.emailEnabled = true;
        break;
      case MFAMethods.SMS:
        if (!phoneNumber) return { success: false };
        updateData.smsEnabled = true;
        updateData.phoneNumber = phoneNumber;
        break;
      default:
        return { success: false };
    }

    const result = await this.mfaSetupModel.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    );

    // Return backup codes on first method setup
    return {
      success: !!result,
      backupCodes: isFirstMethod ? result?.backupCodes : undefined,
    };
  }

  // Check if user has MFA enabled
  static async isMFAEnabled(userId: string): Promise<boolean> {
    const mfaSetup = await this.mfaSetupModel
      .findOne({ userId, enabled: true })
      .exec();

    return !!mfaSetup;
  }

  // Get availabe MFA methods for user
  static async getAvailableMethods(userId: string) {
    const mfaSetup = await this.mfaSetupModel
      .findOne({ userId, enabled: true })
      .exec();
    // if (!mfaSetup) return [];
    if (!mfaSetup) return { mfaEnabled: false, methods: [] };

    const methods: string[] = [];
    if (mfaSetup.emailEnabled) methods.push("email");
    if (mfaSetup.smsEnabled) methods.push("sms");
    methods.push("backup_codes"); // Always available

    // return methods;
    return { methods, mfaEnabled: true };
  }

  // Get backup codes for a user
  // Might be useful in the future (useful for showing them in UI)
  static async getBackupCodes(userId: string): Promise<string[] | null> {
    const mfaSetup = await this.mfaSetupModel.findOne({ userId });
    return mfaSetup?.backupCodes || null;
  }

  // Disable MFA method
  static async disableMFAMethod(
    userId: string,
    method: MFAMethods
  ): Promise<boolean> {
    const updateData: any = {};

    switch (method) {
      case MFAMethods.EMAIL:
        updateData.emailEnabled = false;
        break;
      case MFAMethods.SMS:
        updateData.smsEnabled = false;
        updateData.phoneNumber = undefined;
        break;
      default:
        return false;
    }

    // Check if this is the last method being disabled
    const mfaSetup = await this.mfaSetupModel.findOne({ userId });
    if (!mfaSetup) return false;

    const remainingMethods = [];
    if (method !== MFAMethods.EMAIL && mfaSetup.emailEnabled)
      remainingMethods.push("email");
    if (method !== MFAMethods.SMS && mfaSetup.smsEnabled)
      remainingMethods.push("sms");

    // If no methods remain, disable MFA entirely
    if (remainingMethods.length === 0) {
      updateData.enabled = false;
    }

    const result = await this.mfaSetupModel.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    );

    return !!result;
  }

  // Generate 6-digit verification code
  private static generateVerificationCode(): string {
    return webcrypto.getRandomValues(new Uint32Array(1)).toString().slice(0, 6);
  }

  // Generate backup codes
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(randomBytes(32).toString("hex").toUpperCase());
    }
    return codes;
  }

  // Helper to get user details
  private static async getUserData(userId: string) {
    const user = await this.userModel.findOne({ _id: userId }).exec();
    if (!user) return throwUnprocessableEntityError("Security breach detected");
    return {
      firstName: user.firstName,
      email: user.email,
    };
  }
}
