import { UserTypes } from "@/enums";
import { Document, Model, Schema, Types, model } from "mongoose";

export interface ISuspensionLog extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  role: UserTypes;
  suspensionDate: Date;
  suspendedBy: Types.ObjectId;
  reason: string;
  liftedOn: Date;
  liftedBy: Types.ObjectId;
}

const SuspensionLogSchema: Schema<ISuspensionLog> = new Schema<ISuspensionLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provide user id"],
      ref: "users",
    },
    role: {
      type: String,
      required: [true, "Please provide user role"],
      enum: { values: Object.values(UserTypes), message: "Unsupported role" },
    },
    suspensionDate: {
      type: Date,
      default: Date.now,
      required: [true, "Please provide suspension date"],
    },
    suspendedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "admins",
    },
    reason: {
      type: String,
      required: [true, "Please provide suspension reason"],
    },
    liftedOn: {
      type: Date,
    },
    liftedBy: {
      type: Schema.Types.ObjectId,
      ref: "admins",
    },
  },
  {
    autoIndex: true,
    timestamps: true,
    toJSON: {
      versionKey: false,
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

export const SuspensionLog: Model<ISuspensionLog> = model<ISuspensionLog>(
  "suspension-logs",
  SuspensionLogSchema
);
