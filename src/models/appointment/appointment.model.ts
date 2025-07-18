import { AppointmentStatus } from "@/enums";
import { emailRegex } from "@/utils";
import { Types, Document, Schema, model } from "mongoose";
const collectionName = "appointments";

// Interface for Appointment Document
export interface IAppointment extends Document<Types.ObjectId> {
  summary?: string;
  businessId: Types.ObjectId;
  botId: Types.ObjectId;
  bot?: Types.Map<any>; // Virtual property
  providerId: Types.ObjectId;
  provider?: Types.Map<any>; // Virtual property
  conversationId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  meetingLink?: string;
  status: AppointmentStatus;
  dateTime?: Date; // Virtual property
  notificationSent: boolean;
  metadata: Types.Map<any>;
  scheduledByProvider: boolean;
  createdAt: Date;
}

// Define the Appointment Schema
const AppointmentSchema = new Schema<IAppointment>(
  {
    summary: {
      type: String,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Business id is required"],
      ref: "users",
    },
    botId: {
      type: Schema.Types.ObjectId,
      required: [true, "Bot id is required"],
      ref: "bots",
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "meeting-providers",
    },
    conversationId: {
      type: String,
      required: [true, "Conversation id is required"],
    },
    customerEmail: {
      type: String,
      match: [emailRegex, "Please provide a valid email"],
    },
    customerName: {
      type: String,
    },
    customerPhone: {
      type: String,
    },
    appointmentDate: { type: String },
    appointmentTime: { type: String },
    duration: { type: Number, default: 30 },
    meetingLink: {
      type: String,
      // Optional: set only if the bot is configured for automatic meeting creation
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.PENDING,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    scheduledByProvider: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

AppointmentSchema.virtual("provider", {
  ref: "meeting-providers",
  localField: "providerId",
  foreignField: "_id",
  justOne: true,
});

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

AppointmentSchema.virtual("bot", {
  ref: "bots",
  localField: "botId",
  foreignField: "_id",
  justOne: true,
  options: {
    select: "name",
  },
});

function autoPopulate(this: any, next: Function) {
  this.populate("bot");
  this.populate("provider");
  next();
}

AppointmentSchema.pre("find", autoPopulate);
AppointmentSchema.pre("findOne", autoPopulate);
AppointmentSchema.pre("findOneAndUpdate", autoPopulate);

// Indexing for faster queries
AppointmentSchema.index({ businessId: 1 });
AppointmentSchema.index({ conversationId: 1 });
AppointmentSchema.index({ botId: 1 });
AppointmentSchema.index({ appointmentDate: 1 });
AppointmentSchema.index({ customerEmail: 1 });
AppointmentSchema.index({ customerName: 1 });

// Create the Appointment Model
export const Appointment = model<IAppointment>(
  collectionName,
  AppointmentSchema
);
