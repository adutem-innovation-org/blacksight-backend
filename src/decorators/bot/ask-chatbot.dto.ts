import { UserActions } from "@/enums";
import {
  IsDefined,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class AskChatbotDto {
  @IsDefined({ message: "Please provide the bot's identifier" })
  @IsMongoId({ message: "Bot identifier must be a valid database identifier" })
  botId!: string;

  @IsDefined({ message: "Please provide conversation id" })
  @IsUUID(4, { message: "Invalid conversation identifier" })
  conversationId!: string;

  @IsDefined({ message: "Please provide user query" })
  @IsString({ message: "User query must be a valid string" })
  userQuery!: string;

  @IsOptional()
  @IsEnum(UserActions, { message: "Unsupported user action" })
  action?: UserActions;
}
