import { IsDefined, IsEmail, Length } from "class-validator";

export class CheckUserDto {
  @IsDefined({ message: "Please provide email" })
  @IsEmail({}, { message: "A valid email is required" })
  email!: string;
}

export class VerifyEmailDto {
  @IsDefined()
  @Length(6, 6)
  otp!: string;
}
