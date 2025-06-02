import { AppointmentStatus } from "@/enums";
import { emailRegex } from "@/utils";
import { Types, Document, Schema, model } from "mongoose";
const collectionName = "appointments";
// Interface for Appointment Document
export interface IAppointment extends Document<Types.ObjectId> {
  businessId: Types.ObjectId;
  conversationId: String;
  customerEmail: string;
  appointmentDate: String;
  appointmentTime: String;
  meetingLink: string;
  status: AppointmentStatus;
  dateTime?: Date; // Virtual property
  createdAt: Date;
}

// Define the Appointment Schema
const AppointmentSchema = new Schema<IAppointment>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Business id is required"],
      ref: "users",
    },
    conversationId: {
      type: String,
      required: [true, "Conversation id is required"],
    },
    customerEmail: {
      type: String,
      match: [emailRegex, "Please provide a valid email"],
    },
    appointmentDate: { type: String },
    appointmentTime: { type: String },
    meetingLink: {
      type: String,
      // Optional: set only if the bot is configured for automatic meeting creation
    },
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
  if (!this.appointmentDate || !this.appointmentTime) return null;
  const date = new Date(this.appointmentDate.toString());
  const time = new Date(this.appointmentTime.toString());
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
AppointmentSchema.index({ businessId: 1 });
AppointmentSchema.index({ conversationId: 1 });
AppointmentSchema.index({ appointmentDate: 1 });

// Create the Appointment Model
export const Appointment = model<IAppointment>(
  collectionName,
  AppointmentSchema
);
