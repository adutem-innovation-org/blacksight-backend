import { TemplateCategory, TemplateType } from "@/enums";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty, IsObject,
  IsString,
} from "class-validator";

export class CreateTemplateDto {
  @IsNotEmpty({ message: "Template name must not be empty" })
  @IsString({ message: "Template name must be a string" })
  name!: string;

  @IsNotEmpty({ message: "Template description must not be empty" })
  @IsString({ message: "Template description must be a string" })
  description!: string;

  @IsNotEmpty({ message: "Template type must not be empty" })
  @IsString({ message: "Template type must be a string" })
  @IsEnum(TemplateType, { message: "Invalid template type" })
  type!: TemplateType;

  @IsNotEmpty({ message: "Template category must not be empty" })
  @IsString({ message: "Template category must be a string" })
  @IsEnum(TemplateCategory, { message: "Invalid template category" })
  category!: TemplateCategory;

  @IsNotEmpty({ message: "Template html must not be empty" })
  @IsString({ message: "Template html must be a string" })
  html!: string;

  @IsNotEmpty({message: "Template design must not be empty" })
  @IsObject({message: "Tmeplate design must be an object"})
  design!: any;

  @IsNotEmpty({ message: "Template dynamic fields must not be empty" })
  @IsArray({ message: "Dynamic fields should be an array" })
  @ArrayNotEmpty({
    message: "Dynamic fields are required for the template",
  })
  @IsString({ each: true, message: "Each dynamic field must be a string" })
  dynamicFields!: string[];

  @IsNotEmpty({ message: "Template keywords must not be empty" })
  @IsArray({ message: "Keywords should be an array" })
  @ArrayNotEmpty({
    message: "Keywords are required for the template",
  })
  @IsString({ each: true, message: "Each keyword must be a string" })
  keywords!: string[];
}
