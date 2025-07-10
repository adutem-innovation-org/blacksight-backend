import { Types, Schema, Model, model, Document } from "mongoose";

export interface IWallet extends Document {
  id: string;
  userId: Types.ObjectId;
  balance: number;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema: Schema<IWallet> = new Schema<IWallet>(
  {
    id: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
      unique: true,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
    toObject: {
      virtuals: true,
    },
  }
);

WalletSchema.index({
  balance: "text",
  isLocked: "text",
  userId: "text",
  category: "text",
  type: "text",
  "userId.firstName": "text",
  "userId.lastName": "text",
  "userId.email": "text",
});

WalletSchema.virtual("user", {
  ref: "users",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

export const Wallet: Model<IWallet> = model<IWallet>("wallets", WalletSchema);
