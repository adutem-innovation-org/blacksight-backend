import { Type } from "class-transformer";
import {
  IsDate,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinDate,
} from "class-validator";
import "reflect-metadata";

export class BookingRequestDto {
  @IsNotEmpty({ message: "Please provide customer name" })
  @IsString({ message: "Customer name must be string" })
  customerName!: string;

  @IsNotEmpty({ message: "Please provide customer email" })
  @IsString({ message: "Customer email must be string" })
  @IsEmail({}, { message: "Customer email must be a valid email" })
  customerEmail!: string;

  @IsNotEmpty({ message: "Please provide customer phone" })
  @IsString({ message: "Customer phone must be string" })
  customerPhone!: string;

  @IsNotEmpty({ message: "Please provide date and time" })
  @Type(() => Date)
  @IsDate({ message: "Appointment date must be a valid date" })
  @MinDate(new Date(), {
    message: "Appointment date must be in the future",
  })
  dateTime!: Date;

  @IsNotEmpty({ message: "Please provide timezone" })
  @IsString({ message: "Timezone must be string" })
  timezone!: string;
}
