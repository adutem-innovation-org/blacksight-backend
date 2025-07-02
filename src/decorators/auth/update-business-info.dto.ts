import { IsEmail, IsOptional, IsString, IsUrl } from "class-validator";

export class UpdateBusinessInfoDto {
  @IsOptional()
  @IsString({ message: "Business name must be string" })
  name!: string;

  @IsOptional()
  @IsUrl({}, { message: "Business website must be a valid url" })
  website!: string;

  @IsOptional()
  @IsString({ message: "Please specify the type of service you offer" })
  industry!: string;

  @IsOptional()
  @IsString({ message: "Business address must be string" })
  address!: string;
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
