import {
  EventTrigger,
  RecurrencePattern,
  ReminderCategory,
  ReminderChannels,
  ReminderStatus,
  ReminderTypes,
} from "@/enums";
import { Document, Types, Model, model, Schema } from "mongoose";

export interface IReminder extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  fileId?: Types.ObjectId;
  tag: string;

  // Recipients
  email?: string;
  phone?: string;
  emails?: string[];
  phones?: string[];

  // Basic properties
  channel: ReminderChannels;
  type: ReminderTypes;
  category: ReminderCategory;
  status: ReminderStatus;
  isActive: boolean;
  isBulk: boolean;

  // Content
  subject?: string; // For emails
  message: string;
  template?: string;
  templateId?: string;
  templateData?: Record<string, any>;

  // Scheduling
  remindAt?: Date; // For instant and scheduled
  eventDate?: Date; // For event-based reminders
  eventTrigger?: EventTrigger;
  triggerOffset?: number; // Minutes before/after event

  // Recurrence
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval?: number; // For EVERY_N_* patterns
  recurrenceEnd?: Date; // When to stop recurring
  recurrenceCount?: number; // How many times to repeat
  customCronExpression?: string; // For complex patterns

  // Execution tracking
  nextExecution?: Date;
  lastExecution?: Date;
  executionCount: number;
  maxExecutions?: number;

  // Results tracking
  successCount: number;
  failureCount: number;
  lastError?: string;

  // Metadata
  timezone?: string;
  priority?: number; // 1-10, higher is more important
  retryCount?: number;
  maxRetries?: number;

  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema: Schema<IReminder> = new Schema<IReminder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "users",
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: "files",
    },
    tag: {
      type: String,
      required: true,
    },

    // Recipients
    email: String,
    phone: String,
    emails: [String],
    phones: [String],

    // Basic properties
    channel: {
      type: String,
      enum: Object.values(ReminderChannels),
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(ReminderCategory),
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ReminderTypes),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ReminderStatus),
      default: ReminderStatus.PENDING,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBulk: {
      type: Boolean,
      default: false,
    },

    // Content
    subject: String,
    message: {
      type: String,
      required: true,
    },
    template: String,
    templateId: { type: Schema.Types.ObjectId, ref: "email-templates" },
    templateData: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Scheduling
    remindAt: Date,
    eventDate: Date,
    eventTrigger: {
      type: String,
      enum: Object.values(EventTrigger),
    },
    triggerOffset: {
      type: Number,
      default: 0, // Minutes
    },

    // Recurrence
    recurrencePattern: {
      type: String,
      enum: Object.values(RecurrencePattern),
    },
    recurrenceInterval: {
      type: Number,
      min: 1,
    },
    recurrenceEnd: Date,
    recurrenceCount: {
      type: Number,
      min: 1,
    },
    customCronExpression: String,

    // Execution tracking
    nextExecution: Date,
    lastExecution: Date,
    executionCount: {
      type: Number,
      default: 0,
    },
    maxExecutions: Number,

    // Results tracking
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastError: String,

    // Metadata
    timezone: {
      type: String,
      default: "UTC",
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
reminderSchema.index({ userId: 1, isActive: 1 });
reminderSchema.index({ nextExecution: 1, status: 1, isActive: 1 });
reminderSchema.index({ type: 1, status: 1 });
reminderSchema.index({ createdAt: -1 });

export const Reminder: Model<IReminder> = model<IReminder>(
  "reminders",
  reminderSchema
);
