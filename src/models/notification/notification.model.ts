import { NotificationCategory, SystemNotificationType } from "@/enums";
import { Schema, model, Document, Types, Model } from "mongoose";

export interface INotification extends Document<Types.ObjectId> {
  businessId: string;
  category: NotificationCategory;
  type?: SystemNotificationType;
  title: string;
  message?: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema<INotification>(
  {
    businessId: {
      type: String,
      required: [true, "Must provide notification business id"],
    },
    category: {
      type: String,
      enum: {
        values: Object.values(NotificationCategory),
        message: "Unsupported notification category {{VALUE}}",
      },
      required: [true, "Notification category required"],
    },
    type: {
      type: String,
      required: [
        function () {
          return this.category === NotificationCategory.SYSTEM;
        },
        "System notification type required",
      ],
      enum: {
        values: Object.values(SystemNotificationType),
        message: "Unsupported system notification type",
      },
    },
    title: {
      type: String,
      required: [true, "Please provide notification tytpe"],
    },
    message: {
      type: String,
      required: [
        function () {
          return this.category === NotificationCategory.SYSTEM;
        },
        "Notification message required for system notification",
      ],
    },
    link: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification: Model<INotification> = model<INotification>(
  "Notifications",
  NotificationSchema
);
