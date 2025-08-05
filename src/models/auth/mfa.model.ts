import { Document, Types, Schema, Model, model } from "mongoose";

export interface IMFASetup extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  backupCodes: string[];
  enabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber?: string; // Required for sms if enabled
  createdAt: Date;
  updatedAt: Date;
}

const MFASetupSchema: Schema<IMFASetup> = new Schema<IMFASetup>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provide user id"],
      ref: "users",
    },
    backupCodes: {
      type: [String],
      default: [],
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    emailEnabled: {
      type: Boolean,
      default: false,
    },
    smsEnabled: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { versionKey: false, virtuals: false },
    toObject: { virtuals: false },
  }
);

export const MFASetup: Model<IMFASetup> = model<IMFASetup>(
  "mfa",
  MFASetupSchema
);
