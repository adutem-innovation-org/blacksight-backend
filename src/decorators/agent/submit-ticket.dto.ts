import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import "reflect-metadata";

export class SubmitTicketDto {
  @IsNotEmpty({ message: "Please provide customer name" })
  @IsString({ message: "Customer name must be string" })
  customerName!: string;

  @IsNotEmpty({ message: "Please provide customer email" })
  @IsString({ message: "Customer email must be string" })
  @IsEmail({}, { message: "Customer email must be a valid email" })
  customerEmail!: string;

  @IsNotEmpty({ message: "Please provide message" })
  @IsString({ message: "Ticket message must be string" })
  message!: string;
}
