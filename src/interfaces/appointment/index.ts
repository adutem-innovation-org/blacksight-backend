import { AppointmentStatus } from "@/enums";
import { Types } from "mongoose";

export type ScheduleAppointmentBody = {
  businessId: Types.ObjectId | string;
  conversationId: Types.ObjectId | string;
  customerEmail?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  meetingLink?: string;
  status?: AppointmentStatus;
};
