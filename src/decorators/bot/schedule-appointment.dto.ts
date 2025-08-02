import { IsDefined, IsMongoId, IsUUID } from "class-validator";
import { BookingRequestDto } from "../agent";

export class ScheduleAppointmentDto extends BookingRequestDto {
  @IsDefined({ message: "Please provide the bot's identifier" })
  @IsMongoId({ message: "Bot identifier must be a valid database identifier" })
  botId!: string;

  @IsDefined({ message: "Please provide conversation id" })
  @IsUUID(4, { message: "Invalid conversation identifier" })
  conversationId!: string;
}
