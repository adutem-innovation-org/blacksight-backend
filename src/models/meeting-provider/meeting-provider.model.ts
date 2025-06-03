import { MeetingProvidersEnum } from "@/enums";
import { Document, model, Model, Schema, Types } from "mongoose";

export interface IMeetingProvider extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  provider: MeetingProvidersEnum;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  sub: string;
  expiryDate: Date;
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
          values: Object.values(MeetingProvidersEnum),
          message: "Unsupported provider",
        },
        required: [true, "Please provide meeting provider"],
      },
      accessToken: {
        type: String,
        required: [true, "Please provide provider access token"],
      },
      refreshToken: {
        type: String,
        required: [true, "Please provide provider refresh token"],
      },
      idToken: {
        type: String,
        required: [
          function () {
            return this.provider === MeetingProvidersEnum.GOOGLE;
          },
          "Please provide google id token",
        ],
      },
      sub: {
        type: String,
        required: [
          function () {
            return this.provider === MeetingProvidersEnum.GOOGLE;
          },
          "Please provide google id token",
        ],
      },
      expiryDate: {
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
