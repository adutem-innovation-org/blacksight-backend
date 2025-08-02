import { IsDefined, IsMongoId, IsUUID } from "class-validator";
import { SubmitTicketDto } from "../agent";

export class EscalateChatDto extends SubmitTicketDto {
  @IsDefined({ message: "Please provide the bot's identifier" })
  @IsMongoId({ message: "Bot identifier must be a valid database identifier" })
  botId!: string;

  @IsDefined({ message: "Please provide conversation id" })
  @IsUUID(4, { message: "Invalid conversation identifier" })
  conversationId!: string;
}
