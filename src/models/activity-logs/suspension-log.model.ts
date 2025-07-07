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
  {},
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
