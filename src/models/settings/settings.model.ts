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
