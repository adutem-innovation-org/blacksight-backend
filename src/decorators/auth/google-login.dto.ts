import { IsDefined, IsString, IsEmail, IsBoolean } from "class-validator";

export class GoogleLoginDto {
  @IsDefined()
  @IsString()
  id!: string;

  @IsDefined()
  @IsString()
  accessToken!: string;

  @IsDefined({ message: "Please provide email" })
  @IsEmail({}, { message: "A valid email is required" })
  email!: string;

  @IsDefined({ message: "Please provide first name" })
  @IsString()
  firstName!: string;

  @IsDefined({ message: "Please provide last name" })
  @IsString()
  lastName!: string;

  @IsString()
  photoUrl!: string;
  // isPrivateEmail: boolean;
}
