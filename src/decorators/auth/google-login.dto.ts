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

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  photoUrl!: string;
  // isPrivateEmail: boolean;
}
