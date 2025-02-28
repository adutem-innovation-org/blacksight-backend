import { AppointmentStatus } from "@/enums";
import { Types, Document, Schema, model } from "mongoose";

// Interface for Appointment Document
export interface IAppointment extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  conversationId: Types.ObjectId;
  appointmentDate: Date;
  appointmentTime: Date;
  meetingLink: string;
  status: AppointmentStatus;
  dateTime?: Date; // Virtual property
}

// Define the Appointment Schema
const AppointmentSchema = new Schema<IAppointment>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "Users" },
    conversationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Conversations",
    },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: Date, required: true },
    meetingLink: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.PENDING,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

// Virtual to combine date and time into one Date object
AppointmentSchema.virtual("dateTime").get(function () {
  const date = this.appointmentDate;
  const time = this.appointmentTime;
  if (date && time) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      time.getSeconds()
    );
  }
  return null;
});

// Indexing for faster queries
AppointmentSchema.index({ userId: 1 });
AppointmentSchema.index({ conversationId: 1 });
AppointmentSchema.index({ appointmentDate: 1 });

// Create the Appointment Model
export const AppointmentModel = model<IAppointment>(
  "Appointments",
  AppointmentSchema
);
