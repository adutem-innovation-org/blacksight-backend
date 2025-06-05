import { KnowledgeBaseSources } from "@/enums";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

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

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly isActive?: boolean;
}
