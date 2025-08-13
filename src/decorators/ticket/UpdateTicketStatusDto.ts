import { TicketStatus } from "@/enums";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class UpdateTicketStatusDto {
  @IsNotEmpty({ message: "Please provide ticket status" })
  @IsString({ message: "Ticket status must be string" })
  @IsEnum(TicketStatus, { message: "Unsupported ticket status" })
  status!: TicketStatus;
}
