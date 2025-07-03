import { IsEmail, IsOptional, IsString, IsUrl } from "class-validator";

export class UpdateBusinessInfoDto {
  @IsOptional()
  @IsString({ message: "Business name must be string" })
  name!: string;

  @IsOptional()
  @IsUrl({}, { message: "Your business website must be a valid url" })
  website!: string;

  @IsOptional()
  @IsString({ message: "Your business address must be string" })
  address!: string;

  @IsOptional()
  @IsString({ message: "Your business industry is not supported" })
  industry!: string;
}

export class UpdateBusinessContactInfoDto {
  @IsOptional()
  @IsString({ message: "Contact name must be string" })
  contactName!: string;

  @IsOptional()
  @IsString({ message: "Contact email must be string" })
  @IsEmail({}, { message: "Contact email must be a valid email" })
  contactEmail!: string;

  @IsOptional()
  @IsString({ message: "Contact email must be string" })
  contactTel!: string;
}
