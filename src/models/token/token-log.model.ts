import { Document, model, Model, Schema, Types } from "mongoose";

export interface ITokenLog extends Document<Types.ObjectId> {
  businessId: string;
  botId: string;
  sessionId: string;
  promptTokens: number;
  responseToken: number;
  totalTokens: number;
  userPrompt: string;
}

const TokenLogSchema: Schema<ITokenLog> = new Schema<ITokenLog>(
  {
    businessId: { type: String, required: [true, "Business id is required"] },
    botId: { type: String, required: [true, "Bot id is required"] },
    sessionId: { type: String, required: [true, "Session id is required"] },
    promptTokens: {
      type: Number,
      required: [true, "Prompt tokens is required"],
    },
    responseToken: {
      type: Number,
      required: [true, "Response token is required"],
    },
    totalTokens: { type: Number, required: [true, "Total tokens is required"] },
    userPrompt: { type: String, required: [true, "User prompt is required"] },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false, virtuals: true },
    toObject: { virtuals: true },
  }
);

export const TokenLog: Model<ITokenLog> = model<ITokenLog>(
  "token-logs",
  TokenLogSchema
);
