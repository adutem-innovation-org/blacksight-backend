import { CalendarProvidersEnum } from "@/enums";
import { Document, model, Model, Schema, Types } from "mongoose";

export interface ICalendarProvider extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  provider: CalendarProvidersEnum;
  // For Cal.com
  eventTypeId: string;
  apiKey: string;
  // For Google Calendar
  accessToken: string;
  refreshToken: string;
  idToken: string;
  sub: string;
  expiryDate: Date;
}

const CalendarProviderSchema: Schema<ICalendarProvider> =
  new Schema<ICalendarProvider>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        required: [true, "Please provider user id"],
        ref: "users",
      },
      provider: {
        type: String,
        enum: {
          values: Object.values(CalendarProvidersEnum),
          message: "Unsupported provider",
        },
        required: [true, "Please provide calendar provider"],
      },
      // For Cal.com
      eventTypeId: {
        type: String,
        required: [
          function () {
            return this.provider === CalendarProvidersEnum.CALCOM;
          },
          "Please provide cal.com event type id",
        ],
      },
      apiKey: {
        type: String,
        required: [
          function () {
            return this.provider === CalendarProvidersEnum.CALCOM;
          },
          "Please provide cal.com api key",
        ],
      },
      // For Google Calendar
      accessToken: {
        type: String,
        required: [
          function () {
            return this.provider === CalendarProvidersEnum.GOOGLE;
          },
          "Please provide provider access token",
        ],
      },
      refreshToken: {
        type: String,
        required: [
          function () {
            return this.provider === CalendarProvidersEnum.GOOGLE;
          },
          "Please provide provider refresh token",
        ],
      },

      idToken: {
        type: String,
        required: [
          function () {
            return this.provider === CalendarProvidersEnum.GOOGLE;
          },
          "Please provide google id token",
        ],
      },
      sub: {
        type: String,
        required: [
          function () {
            return this.provider === CalendarProvidersEnum.GOOGLE;
          },
          "Please provide google id token",
        ],
      },
      expiryDate: {
        type: Date,
        required: [
          function () {
            return this.provider === CalendarProvidersEnum.GOOGLE;
          },
          "Please provide token expiration date",
        ],
      },
    },
    {
      timestamps: true,
      autoIndex: true,
      toJSON: { virtuals: true, versionKey: false },
      toObject: { virtuals: true },
    }
  );

export const CalendarProvider: Model<ICalendarProvider> =
  model<ICalendarProvider>("meeting-providers", CalendarProviderSchema);
