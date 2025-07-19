import { CurrencyEnum } from "@/enums";
import { Document, Types, Schema, Model, model } from "mongoose";

export interface ISettings extends Document<Types.ObjectId> {
  costPerRU: number; // Cost per knowledge-base read unit (reference pinecone database pricing). This value is not to be set arbitrarily. If pinecone charges $16/1M RU. Then costPerRU is 16 / 1_000_000
  currency: CurrencyEnum; // The currency in which the estimation is being done (Default to USD)
  costPerToken: number; // How much each blacksight saas token cost e.g. $0.001 per token. Or 10_000 token for $10
  costPerWU: number; // Cost per knowledge-base write unit (reference pinecone database pricing). This value is not to be set arbitrarily. If pinecone charges $4/1M WU. Then costPerRU is 4 /1_000_000
  markUpPercent: number; // How much percent we are adding to the cost Per RU to maintain profit.
  costPerStorageGB: number; // How much is charged per 1GB of knowledge-base storage per month
  storageMarkUpPercent: number; // How much percent we are adding to the cost per storage to maintain profit
  tokenConversionFactor: number; // How much openai token is equal to 1 blacksight saas token

  // For openai billings
  // # Chat completion
  costPerPromptToken: number; // How much it cost per prompt token. e.g. if openai charges $2.50 for 1M input prompt token then costPerPromptToken is 2.50 / 1_000_000
  costPerCachedPromptToken: number; // How much it cost per cached prompt token. e.g. if openai charges $1.25 for 1M cached prompt token then costPerCachedPromptToken is 1.25 / 1_000_000
  costPerCompletionToken: number; // How much it cost per completion token. e.g. if openai charges $10.00 for 1M completion token then costPerCompletionToken is 10.00 / 1_000_000
  chatCompletionMarkUpPercent: number; // How much percent we are adding to the cost per chat completion to maintain profit

  // # Embeddings
  costPerEmbeddingToken: number; // How much it cost per embedding token. e.g. if openai charges $0.02 for 1M embedding token then costPerEmbeddingToken is 0.02 / 1_000_000
  embeddingsMarkUpPercent: number; // How much percent we are adding to the cost per embeddings to maintain profit

  // # Transcription
  costPerTranscriptionMinute: number; // How much it cost per transcription minute. e.g. $0.0006 per minute.
  transcriptionMarkUpPercent: number; // How much percent we are adding to the cost per transcription to maintain profit
}

const SettingsSchema: Schema<ISettings> = new Schema<ISettings>(
  {
    costPerRU: {
      type: Number,
      required: [true, "Missing cost per knowledge-base read unit"],
    },
    currency: {
      type: String,
      enum: {
        values: Object.values(CurrencyEnum),
        message: "Unsupported currency {VALUE}",
      },
      default: CurrencyEnum.DOLLAR,
    },
    costPerToken: {
      type: Number,
      required: [true, "Missing cost per token"],
    },
    costPerWU: {
      type: Number,
      required: [true, "Missing cost per knowledge-base write unit"],
    },
    markUpPercent: {
      type: Number,
      required: [true, "Missing markup percent"],
    },
    costPerStorageGB: {
      type: Number,
      required: [true, "Missing cost per storage"],
    },
    storageMarkUpPercent: {
      type: Number,
      required: [true, "Missing storage markup percent"],
    },
    tokenConversionFactor: {
      type: Number,
      required: [true, "Missing token conversion factor"],
    },

    // For openai billings
    // # Chat completion
    costPerPromptToken: {
      type: Number,
      required: [true, "Missing cost per prompt token"],
    },
    costPerCachedPromptToken: {
      type: Number,
      required: [true, "Missing cost per cached prompt token"],
    },
    costPerCompletionToken: {
      type: Number,
      required: [true, "Missing cost per completion token"],
    },
    chatCompletionMarkUpPercent: {
      type: Number,
      required: [true, "Missing chat completion markup percent"],
    },

    // # Embeddings
    costPerEmbeddingToken: {
      type: Number,
      required: [true, "Missing cost per embedding token"],
    },
    embeddingsMarkUpPercent: {
      type: Number,
      required: [true, "Missing embeddings markup percent"],
    },

    // # Transcription
    costPerTranscriptionMinute: {
      type: Number,
      required: [true, "Missing cost per transcription minute"],
    },
    transcriptionMarkUpPercent: {
      type: Number,
      required: [true, "Missing transcription markup percent"],
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { virtuals: false, versionKey: false },
    toObject: {
      versionKey: false,
      virtuals: false,
    },
  }
);

export const Settings: Model<ISettings> = model<ISettings>(
  "settings",
  SettingsSchema
);
