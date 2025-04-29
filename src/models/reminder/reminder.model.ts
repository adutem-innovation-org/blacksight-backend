import { ReminderChannels, ReminderTypes } from "@/enums";
import { Document, Types, Model, model, Schema } from "mongoose";
const collectionName = "reminders";

export interface IReminder extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  tag: string;
  email?: string;
  phone?: string;
  emails?: string[];
  phones?: string[];
  channel: ReminderChannels;
  type: ReminderTypes;
  remindAt: Date;
  isActive: boolean;
  isBulk: boolean;
  reminderSent: boolean;
  reminderSentAt: Date;
}

const reminderSchema: Schema<IReminder> = new Schema<IReminder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provider user id"],
      ref: "users",
    },
    tag: {
      type: String,
      required: [true, "Please provider reminder tag"],
    },
    email: {
      type: String,
      required: [
        function () {
          return this.channel === ReminderChannels.EMAIL && !this.isBulk;
        },
        "Email required for email-channel reminder",
      ],
    },
    phone: {
      type: String,
      required: [
        function () {
          return this.channel === ReminderChannels.SMS && !this.isBulk;
        },
        "Phone number required for sms-channel reminder",
      ],
    },
    emails: {
      type: [String],
      default: undefined,
      required: [
        function () {
          return this.isBulk && this.channel === ReminderChannels.EMAIL;
        },
        "Emails required for bulk reminder with an email-channel",
      ],
    },
    phones: {
      type: [String],
      default: undefined,
      required: [
        function () {
          return this.isBulk && this.channel === ReminderChannels.SMS;
        },
        "Phone numbers required for bulk reminder with SMS-channel",
      ],
    },
    channel: {
      type: String,
      enum: {
        values: Object.values(ReminderChannels),
        message: "Unsupported reminder channel {{VALUE}}",
      },
      required: [true, "Please specify reminder channel"],
    },
    type: {
      type: String,
      enum: {
        values: Object.values(ReminderTypes),
        message: "Unsupported reminder type {{VALUE}}",
      },
      required: [true, "Please specify reminder type"],
    },
    remindAt: {
      type: Date,
      required: [true, "Please specify reminder time"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBulk: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

export const Reminder: Model<IReminder> = model<IReminder>(
  collectionName,
  reminderSchema
);
