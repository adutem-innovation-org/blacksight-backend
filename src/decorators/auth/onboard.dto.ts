import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  IsIn,
  ValidateIf,
  Matches,
  IsEnum,
} from "class-validator";
import { Transform } from "class-transformer";
import "reflect-metadata";
import { CompanySize, PreferredContactMethodEnum, UserRole } from "@/enums";

// export class OnboardBusinessDto {
//   @IsDefined({ message: "Please provide business name" })
//   @IsString({ message: "Business name must be string" })
//   name?: string;

//   @IsDefined({ message: "Please provide business website" })
//   @IsUrl({}, { message: "Business website must be a valid url" })
//   website?: string;

//   @IsString({ message: "Please specify the type of service you offer" })
//   industry!: string;

//   @IsDefined({ message: "Please provide business address" })
//   @IsString({ message: "Business address must be string" })
//   address!: string;

//   @IsDefined({ message: "Please provide contact name" })
//   @IsString({ message: "Contact name must be string" })
//   contactName!: string;

//   @IsDefined({ message: "Please provide contact email" })
//   @IsString({ message: "Contact email must be string" })
//   @IsEmail({}, { message: "Contact email must be a valid email" })
//   contactEmail!: string;

//   @IsDefined({ message: "Please provide contact email" })
//   @IsString({ message: "Contact email must be string" })
//   contactTel!: string;

//   @IsOptional()
//   @IsArray({ message: "Objectives should be an array" })
//   objectives?: string[];

//   @IsOptional()
//   @IsString({ message: "Company structure must be string" })
//   companyStructure?: string;
// }

export class OnboardBusinessDto {
  @IsString()
  @IsEnum(Object.values(UserRole), { message: "Please select a valid role" })
  role!: string;

  // @IsNotEmpty({ message: "Please provide your business name" })
  @IsOptional()
  @IsString({ message: "Business name must be string" })
  name?: string;

  // @IsNotEmpty({ message: "Please provide your business website" })
  @IsOptional()
  @IsUrl({}, { message: "Your business website must have a valid url" })
  @IsString({ message: "Your business website url must be string" })
  website?: string;

  // @IsNotEmpty({ message: "Please provide your business address" })
  // @IsString({ message: "Your business address must be string" })
  // address?: string;

  @IsOptional()
  @IsEmail({}, { message: "Your business email must be a valid email" })
  @IsString({ message: "Your business email must be string" })
  businessEmail?: string;

  // @IsNotEmpty({ message: "Please specify your business's industry" })
  @IsOptional()
  @IsString({ message: "Your business industry is not supported" })
  industry?: string;

  // @IsNotEmpty({
  //   message: "Please specify the number of employees in your business",
  // })
  @IsOptional()
  @IsString()
  @IsEnum(Object.values(CompanySize), {
    message: "Please select a compnay size",
  })
  numberOfEmployees?: string;

  @IsOptional()
  @IsString()
  primaryGoal?: string;

  @IsOptional()
  @IsString()
  // @IsNotEmpty({ message: "Please tell us how you found out about us?" })
  leadSource?: string;

  @IsOptional()
  @IsString()
  preferredFeature?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === "true")
  receiveUpdates = false;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredContentType?: string[];

  @IsOptional()
  @IsString()
  // @IsNotEmpty({ message: "Please specify if you consent to feedback call" })
  feedbackCallConsent?: string;

  @ValidateIf((o) => o.feedbackCallConsent === "Yes")
  @IsString()
  @IsEnum(Object.values(PreferredContactMethodEnum), {
    message: "Unsupported contact method",
  })
  @IsNotEmpty({ message: "Please select a preferred contact method" })
  preferredContactMethod?: string;

  @ValidateIf(
    (o) => o.feedbackCallConsent === "Yes" && !!o.preferredContactMethod?.trim()
  )
  @IsString()
  @IsNotEmpty({ message: "Please provide contact information" })
  @ValidateIf(
    (o) => o.preferredContactMethod === PreferredContactMethodEnum.EMAIL
  )
  @IsEmail({}, { message: "Please provide a valid contact email" })
  contactInfo?: string;
}
