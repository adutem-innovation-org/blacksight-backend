import { MFAMethods } from "@/enums";
import { IsEnum, IsNotEmpty } from "class-validator";

export class SendMFACodeDto {
  @IsNotEmpty({ message: "Please specify mfa method" })
  @IsEnum(MFAMethods, { message: "Unsupported mfa method" })
  method!: MFAMethods;
}
