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
  providerId?: Types.ObjectId;
  provider?: Types.Map<any>; // Virtual property
  conversationId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  appointmentDateInCustomerTimezone: string;
  appointmentTimeInCustomerTimezone: string;
  appointmentDateInUTC: string;
  appointmentTimeInUTC: string;
  timezone: string;
  dateTimeInCustomerTimezone: Date;
  dateTimeInUTC: Date;
  duration: number;
  meetingLink?: string;
  status: AppointmentStatus;
  confirmationEmailSent: boolean;
  metadata: Types.Map<any>;
  scheduledByProvider: boolean;
  createdAt: Date;
  updatedAt: Date;
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
      ref: "calendar-providers",
    },
    conversationId: {
      type: String,
      required: [true, "Conversation id is required"],
    },
    customerEmail: {
      type: String,
      match: [emailRegex, "Please provide a valid email"],
      required: [true, "Customer email is required"],
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
    },
    customerPhone: {
      type: String,
      required: [true, "Customer phone is required"],
    },
    appointmentDateInCustomerTimezone: {
      type: String,
      required: [true, "Appointment date in customer timezone is required"],
    },
    appointmentTimeInCustomerTimezone: {
      type: String,
      required: [true, "Appointment time in customer timezone is required"],
    },
    appointmentDateInUTC: {
      type: String,
      required: [true, "Appointment date in UTC is required"],
    },
    appointmentTimeInUTC: {
      type: String,
      required: [true, "Appointment time in UTC is required"],
    },
    timezone: {
      type: String,
      required: [true, "Timezone is required"],
    },
    dateTimeInCustomerTimezone: {
      type: Date,
      required: [true, "Date time in customer timezone is required"],
    },
    dateTimeInUTC: {
      type: Date,
      required: [true, "Date time in UTC is required"],
    },
    duration: { type: Number, default: 30 },
    meetingLink: {
      type: String,
      // Optional: set only if the bot is configured for automatic meeting creation
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.SCHEDULED,
    },
    confirmationEmailSent: {
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
  ref: "calendar-providers",
  localField: "providerId",
  foreignField: "_id",
  justOne: true,
});

// Virtual to combine date and time into one Date object
// AppointmentSchema.virtual("dateTime").get(function () {
//   if (!this.appointmentDate || !this.appointmentTime) return null;
//   const date = new Date(this.appointmentDate.toString());
//   const time = new Date(this.appointmentTime.toString());
//   if (date && time) {
//     return new Date(
//       date.getFullYear(),
//       date.getMonth(),
//       date.getDate(),
//       time.getHours(),
//       time.getMinutes(),
//       time.getSeconds()
//     );
//   }
//   return null;
// });

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
AppointmentSchema.index({ appointmentDateInUTC: 1 });
AppointmentSchema.index({ appointmentTimeInUTC: 1 });
AppointmentSchema.index({ dateTimeInUTC: 1 });
AppointmentSchema.index({ customerEmail: 1 });
AppointmentSchema.index({ customerName: 1 });

// Create the Appointment Model
export const Appointment = model<IAppointment>(
  collectionName,
  AppointmentSchema
);
