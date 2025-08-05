import { MFAMethods } from "@/enums";
import { IsEnum, IsNotEmpty, Length } from "class-validator";

export class VerifyMFACodeDto {
  @IsNotEmpty({ message: "Please enter the 6-digit code sent to you" })
  @Length(6, 6, { message: "Verification code must be 6 digits" })
  code!: string;

  @IsNotEmpty({ message: "Please specify mfa method" })
  @IsEnum(MFAMethods, { message: "Unsupported mfa method" })
  method!: MFAMethods;
}
