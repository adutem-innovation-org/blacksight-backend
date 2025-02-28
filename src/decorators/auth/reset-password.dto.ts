import { passwordRegex } from "@/utils";
import {
  IsDefined,
  IsEmail,
  IsNumberString,
  Length,
  Matches,
  MinLength,
} from "class-validator";

export class ResetPasswordDto {
  @IsDefined({ message: "Please provide password" })
  @MinLength(8, { message: "Minimum of 8 character required" })
  @Matches(passwordRegex, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, a number and special character",
  })
  readonly password!: string;

  @IsDefined()
  @IsNumberString()
  @Length(6, 6)
  readonly code!: string;

  @IsDefined({ message: "Please provide email" })
  @IsEmail({}, { message: "A valid email is required" })
  readonly email!: string;
}
