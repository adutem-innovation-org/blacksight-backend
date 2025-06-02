import { IsDefined, IsMongoId, IsUUID } from "class-validator";

export class TranscribeChatAudioDto {
  @IsDefined({ message: "Please provide the bot's identifier" })
  @IsMongoId({ message: "Bot identifier must be a valid database identifier" })
  botId!: string;
}
