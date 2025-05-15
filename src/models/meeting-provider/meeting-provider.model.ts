import { MeetingProviders } from "@/enums";
import { Document, model, Model, Schema, Types } from "mongoose";

export interface IMeetingProvider extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  provider: MeetingProviders;
  access_token: string;
  refresh_token: string;
  expiry_date: Date;
}

const MeetingProviderSchema: Schema<IMeetingProvider> =
  new Schema<IMeetingProvider>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        required: [true, "Please provider user id"],
        ref: "users",
      },
      provider: {
        type: String,
        enum: {
          values: Object.values(MeetingProviders),
          message: "Unsupported provider",
        },
      },
      access_token: {
        type: String,
        required: [true, "Please provide provider access token"],
      },
      refresh_token: {
        type: String,
        required: [true, "Please provide provider refresh token"],
      },
      expiry_date: {
        type: Date,
        required: [true, "Please provide token expiration date"],
      },
    },
    {
      timestamps: true,
      autoIndex: true,
      toJSON: { virtuals: true, versionKey: false },
      toObject: { virtuals: true },
    }
  );

export const MeetingProvider: Model<IMeetingProvider> = model<IMeetingProvider>(
  "meeting-providers",
  MeetingProviderSchema
);
