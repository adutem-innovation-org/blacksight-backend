import { AppointmentStatus } from "@/enums";
import { IsDefined, IsEnum } from "class-validator";

export class UpdateAppointmentStatusDto {
  @IsDefined({ message: "Please provide new status" })
  @IsEnum(AppointmentStatus, { message: "Unsupported appointment status" })
  status!: AppointmentStatus;
}
