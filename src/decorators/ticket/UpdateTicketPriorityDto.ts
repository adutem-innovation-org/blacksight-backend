import { TicketPriority } from "@/enums";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class UpdateTicketPriorityDto {
  @IsNotEmpty({ message: "Please provide ticket priority" })
  @IsString({ message: "Ticket priority must be string" })
  @IsEnum(TicketPriority, { message: "Unsupported ticket priority" })
  priority!: TicketPriority;
}
