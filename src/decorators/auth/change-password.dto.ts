import { passwordRegex } from "@/utils";
import { IsDefined, Matches, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsDefined({ message: "Please provide password" })
  @MinLength(8, { message: "Minimum of 8 character required" })
  @Matches(passwordRegex, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, a number and special character",
  })
  readonly password!: string;

  @IsDefined({ message: "Please provide password" })
  @MinLength(8, { message: "Minimum of 8 character required" })
  @Matches(passwordRegex, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, a number and special character",
  })
  readonly oldPassword!: string;
}
