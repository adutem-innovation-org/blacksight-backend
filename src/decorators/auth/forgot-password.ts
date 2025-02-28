import { IsDefined, IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @IsDefined({ message: "Please provide email" })
  @IsEmail({}, { message: "A valid email is required" })
  readonly email!: string;
}
