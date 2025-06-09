import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDefined,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";
import { Types } from "mongoose";

export class ConfigureBotDto {
  @IsDefined({ message: "Please provide bot name" })
  @IsString({ message: "Bot name must be string" })
  name!: string;

  // @IsDefined({ message: "Please provide knowledge base identifier" })
  // @IsMongoId({
  //   message: "Knowledge base identifier must be a valid database identifier",
  // })
  // knowledgeBaseId!: Types.ObjectId;
  @IsArray({ message: "Knowledge bases should be an array" })
  @ArrayNotEmpty({
    message: "You must select at least one knowledge base",
  })
  @IsMongoId({
    each: true,
    message:
      "Each knowledge base identifier must be a valid database identifier",
  })
  knowledgeBaseIds!: Types.ObjectId[];

  @IsOptional()
  @IsString({ message: "Instructions must be of type string" })
  instructions?: string;

  @IsOptional()
  @IsString({ message: "Welcome message must be string" })
  welcomeMessage?: string;

  @IsDefined({ message: "Please specify is meeting should be scheduled" })
  @Type(() => Boolean)
  @IsBoolean()
  scheduleMeeting!: boolean;

  @ValidateIf((o) => o.scheduleMeeting)
  @IsDefined({
    message:
      "Must provider meeting provider if automatically meeting scheduling is preferred",
  })
  @IsMongoId({
    message: "Meeting provider identifier must be a valid database identifier",
  })
  meetingProviderId?: Types.ObjectId;
}

export class UpdateBotConfigurationDto {
  @IsOptional()
  @IsString({ message: "Bot name must be string" })
  name?: string;

  @IsOptional()
  // @IsMongoId({
  //   message: "Knowledge base identifier must be a valid database identifier",
  // })
  // knowledgeBaseId?: Types.ObjectId;
  @IsArray({ message: "Knowledge bases should be an array" })
  @ArrayNotEmpty({
    message: "You must select at least one knowledge base",
  })
  @IsMongoId({
    each: true,
    message:
      "Each knowledge base identifier must be a valid database identifier",
  })
  knowledgeBaseIds?: Types.ObjectId[];

  @IsOptional()
  @IsString({ message: "Instructions must be of type string" })
  instructions?: string;

  @IsOptional()
  @IsString({ message: "Welcome message must be string" })
  welcomeMessage?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: "Schedule meeting must be boolean" })
  scheduleMeeting?: boolean;

  @ValidateIf((o) => o.scheduleMeeting)
  @IsMongoId({
    message: "Meeting provider identifier must be a valid database identifier",
  })
  meetingProviderId?: Types.ObjectId;
}

export class UpdateBotInstructionsDto {
  @IsOptional()
  @IsString({ message: "Instructions must be of type string" })
  instructions?: string;
}
