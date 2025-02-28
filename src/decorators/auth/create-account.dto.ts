import { passwordRegex } from "@/utils";
import { Type } from "class-transformer";
import {
  IsDefined,
  IsEmail,
  Matches,
  MaxDate,
  MinLength,
} from "class-validator";
import "reflect-metadata";

export class CreateAccountDto {
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
