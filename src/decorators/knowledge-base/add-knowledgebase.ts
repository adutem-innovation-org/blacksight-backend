import { KnowledgeBaseSources } from "@/enums";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import "reflect-metadata";

@ValidatorConstraint({ name: "IsHttpOrHttpsUrl", async: false })
export class IsHttpOrHttpsUrl implements ValidatorConstraintInterface {
  validate(url: string, validationArguments?: ValidationArguments) {
    // return url.startsWith("http://") || url.startsWith("https://");
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch (error) {
      return false;
    }
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "Only HTTP and HTTPS URLs are allowed";
  }
}

export class AddKnowledgeBaseDto {
  @IsDefined({ message: "Pleae provide tag" })
  @IsString({ message: "Knowledge base tag must be of type string" })
  readonly tag!: string;

  @IsDefined({ message: "Please specify knowledge base source" })
  @IsEnum(KnowledgeBaseSources, {
    message: "Unsupported source",
  })
  readonly source!: string;

  @ValidateIf((o) => o.source === KnowledgeBaseSources.TEXT_INPUT)
  @IsDefined({ message: "Text input data is required" })
  readonly text?: string;

  @ValidateIf((o) => o.source === KnowledgeBaseSources.URL)
  @IsDefined({ message: "URL is required" })
  @IsUrl({}, { message: "URL must be a valid url" })
  @Validate(IsHttpOrHttpsUrl)
  readonly url?: string;

  @ValidateIf((o) => o.source === KnowledgeBaseSources.PROMPT)
  @IsDefined({ message: "Generated knowledge base is required" })
  @IsString({ message: "Generated knowledge base must be a string" })
  readonly generatedKB!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly isActive?: boolean;
}
