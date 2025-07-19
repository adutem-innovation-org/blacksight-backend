import { TokenizedOperations } from "@/enums";
import { Document, model, Model, Schema, Types } from "mongoose";

export interface ITokenLog extends Document<Types.ObjectId> {
  businessId: string;
  botId?: string;
  sessionId: string;
  operationType: TokenizedOperations;
  promptTokens?: number;
  responseTokens?: number;
  embeddingTokens?: number;
  readUnits?: number;
  writeUnits?: number;
  totalTokens: number;
  userPrompt?: string;
  transcriptionMinutes?: number;
  reference: string;
}

const TokenLogSchema: Schema<ITokenLog> = new Schema<ITokenLog>(
  {
    businessId: { type: String, required: [true, "Business id is required"] },
    botId: {
      type: String,
      required: [
        function () {
          return this.operationType === TokenizedOperations.CHAT_COMPLETION;
        },
        "Bot id is required",
      ],
    },
    sessionId: {
      type: String,
      required: [
        function () {
          return this.operationType === TokenizedOperations.CHAT_COMPLETION;
        },
        "Session id is required",
      ],
    },
    operationType: {
      type: String,
      required: [true, "Operation type is required"],
      enum: {
        values: Object.values(TokenizedOperations),
        message: "Unsupported operation type",
      },
    },
    promptTokens: {
      type: Number,
      required: [
        function () {
          return this.operationType === TokenizedOperations.CHAT_COMPLETION;
        },
        "Prompt tokens is required",
      ],
    },
    responseTokens: {
      type: Number,
      required: [
        function () {
          return this.operationType === TokenizedOperations.CHAT_COMPLETION;
        },
        "Response tokens is required",
      ],
    },
    embeddingTokens: {
      type: Number,
      required: [
        function () {
          return this.operationType === TokenizedOperations.KNOWLEDGE_BASE_READ;
        },
        "Embedding tokens is required",
      ],
    },
    readUnits: {
      type: Number,
      required: [
        function () {
          return this.operationType === TokenizedOperations.KNOWLEDGE_BASE_READ;
        },
        "Read units is required",
      ],
    },
    writeUnits: {
      type: Number,
      required: [
        function () {
          return (
            this.operationType === TokenizedOperations.KNOWLEDGE_BASE_WRITE
          );
        },
        "Write units is required",
      ],
    },
    totalTokens: { type: Number, required: [true, "Total tokens is required"] },
    userPrompt: {
      type: String,
      required: [
        function () {
          return this.operationType === TokenizedOperations.CHAT_COMPLETION;
        },
        "User prompt is required",
      ],
    },
    transcriptionMinutes: {
      type: Number,
      required: [
        function () {
          return this.operationType === TokenizedOperations.SPEECH_TO_TEXT;
        },
        "Transcription minutes is required",
      ],
    },
    reference: {
      type: String,
    },
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
