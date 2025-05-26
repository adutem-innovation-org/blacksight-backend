import { IsDefined, IsMongoId } from "class-validator";

export class StartConversationDto {
  @IsDefined({ message: "Please provide the bot's identifier" })
  @IsMongoId({ message: "Bot identifier must be a valid database identifier" })
  botId!: string;
}
