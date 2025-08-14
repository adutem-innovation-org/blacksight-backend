import { AppointmentStatus } from "@/enums";
import {
  IsDefined,
  IsEnum,
  IsString,
  ValidateIf,
  IsNotEmpty,
  MinLength,
} from "class-validator";

export class UpdateAppointmentStatusDto {
  @IsDefined({ message: "Please provide new status" })
  @IsEnum(AppointmentStatus, { message: "Unsupported appointment status" })
  status!: AppointmentStatus;

  @ValidateIf((o) => o.status === AppointmentStatus.CANCELLED)
  @IsNotEmpty({ message: "Please provide cancellation reason" })
  @IsString({ message: "Cancellation reason must be string" })
  @MinLength(20, { message: "Cancellation reason too short" })
  reason!: string;
}
