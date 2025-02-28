import { passwordRegex } from "@/utils";
import { IsDefined, IsEmail, MinLength, Matches } from "class-validator";

export class CreateAuthDto {
  @IsDefined({ message: "Please provide email" })
  @IsEmail({}, { message: "A valid email is required" })
  email!: string;

  @IsDefined({ message: "Please provide password" })
  @MinLength(8, { message: "Minimum of 8 character required" })
  @Matches(passwordRegex, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, a number and special character",
  })
  readonly password!: string;

  @IsDefined()
  readonly firstName!: string;

  @IsDefined()
  readonly lastName!: string;
}
