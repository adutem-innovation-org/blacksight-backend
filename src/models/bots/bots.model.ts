import { defaultInstruction } from "@/constants";
import { BookingProviders, BotStatus } from "@/enums";
import { Types, Model, model, Schema, Document } from "mongoose";
const collectionName = "bots";

export interface IBot extends Document<Types.ObjectId> {
  businessId: Types.ObjectId;
  knowledgeBaseId: Types.ObjectId;
  appointmentBookerId: Types.ObjectId;
  instructions: string[];
  bookingProvider: BookingProviders;
  bookingApiKey: string;
  bookingUrl: string;
  status: BotStatus;
  name: string;
}

const BotSchema: Schema<IBot> = new Schema<IBot>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Business id is required"],
      ref: "users",
    },
    knowledgeBaseId: {
      type: Schema.Types.ObjectId,
      ref: "knowledge-bases",
    },
    appointmentBookerId: {
      type: Schema.Types.ObjectId,
      ref: "appointment-bookers",
    },
    instructions: {
      type: [String],
      default: [defaultInstruction],
    },
    bookingProvider: {
      type: String,
      enum: {
        values: Object.values(BookingProviders),
        message: "Unsupported provider",
      },
    },
    bookingApiKey: {
      type: String,
    },
    bookingUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(BotStatus),
        message: "Unsupported status",
      },
      default: BotStatus.INACTIVE,
    },
    name: {
      type: String,
      required: [true, "Bot name is required"],
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

export const Bot: Model<IBot> = model<IBot>(collectionName, BotSchema);
