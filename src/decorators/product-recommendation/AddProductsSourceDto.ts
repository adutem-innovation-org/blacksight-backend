import { ApiSourceAuthMethod, KnowledgeBaseSources } from "@/enums";
import {
  IsDefined,
  IsEnum,
  IsJWT,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
} from "class-validator";
import "reflect-metadata";
import { IsHttpOrHttpsUrl } from "../knowledge-base";

export class AddProductsSourceDto {
  @IsDefined({ message: "Pleae provide tag" })
  @IsString({ message: "Products source tag must be of type string" })
  readonly tag!: string;

  @IsDefined({ message: "Please specify product source type" })
  @IsEnum(KnowledgeBaseSources, {
    message: "Unsupported source",
  })
  readonly source!: KnowledgeBaseSources;

  @ValidateIf((o) => o.source === KnowledgeBaseSources.TEXT_INPUT)
  @IsDefined({ message: "Text input data is required" })
  readonly text?: string;

  @ValidateIf((o) => o.source === KnowledgeBaseSources.API)
  @IsDefined({ message: "API url is required" })
  @IsString({ message: "API url must be a valid url" })
  @Validate(IsHttpOrHttpsUrl)
  readonly apiUrl!: string;

  @ValidateIf((o) => o.source === KnowledgeBaseSources.API)
  @IsDefined({ message: "API auth method is required" })
  @IsEnum(ApiSourceAuthMethod, { message: "Unsupported auth method" })
  readonly authMethod!: string;

  @ValidateIf((o) => o.authMethod === ApiSourceAuthMethod.X_API_KEY)
  @IsDefined({ message: "API key is required" })
  readonly apiKey?: string;

  @ValidateIf((o) => o.authMethod === ApiSourceAuthMethod.BEARER)
  @IsDefined({ message: "Bearer token is required" })
  @IsJWT({ message: "Bearer token must be a valid JWT" })
  readonly bearerToken?: string;

  @ValidateIf((o) => o.authMethod === ApiSourceAuthMethod.BASIC)
  @IsDefined({ message: "Basic auth username is required" })
  @IsString({ message: "Basic auth username must be a string" })
  readonly username?: string;

  @ValidateIf((o) => o.authMethod === ApiSourceAuthMethod.BASIC)
  @IsDefined({ message: "Basic auth password is required" })
  @IsString({ message: "Basic auth password must be a string" })
  readonly password?: string;

  @IsOptional()
  readonly updateInterval?: string;
}
