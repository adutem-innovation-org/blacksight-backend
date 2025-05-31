import { IsDefined, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
  @IsDefined({ message: "Please provide first name" })
  @IsString({ message: "First name must be string" })
  firstName!: string;

  @IsDefined({ message: "Please provide last name" })
  @IsString({ message: "Last name must be string" })
  lastName!: string;

  @IsOptional()
  @IsString({ message: "City name must be string" })
  phone?: string;
}
