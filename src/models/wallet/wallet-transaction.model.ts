import { Schema, Model, model, Types, Document } from "mongoose";
import {
  WalletTransactionCategory,
  WalletTransactionDescription,
} from "@/enums";
import { IUser } from "../auth";
import { ITransaction } from "../transaction";
const collectionName = "wallet-transactions";

export enum WalletTransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export enum WalletTransactionType {
  CREDIT = "credit",
  DEBIT = "debit",
}

export interface IWalletTransaction extends Document {
  id: string;
  amount: number;
  businessId: Types.ObjectId;
  walletId: Types.ObjectId;
  tokenLogId: Types.ObjectId;
  conversationId: string;
  status: WalletTransactionStatus;
  type: WalletTransactionType;
  category: WalletTransactionCategory;
  reference: string;
  description: WalletTransactionDescription;
  createdAt: Date;
  updatedAt: Date;
  rollbackReference: string;
  meta: object;
  isRolledback: boolean;
  user: IUser;
  tokenUsageMeta?: object;
  transaction?: ITransaction;
}

const WalletTransactionSchema: Schema<IWalletTransaction> =
  new Schema<IWalletTransaction>(
    {
      id: {
        type: String,
      },
      amount: {
        type: Number,
      },
      businessId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        index: true,
      },
      walletId: {
        type: Schema.Types.ObjectId,
        ref: "wallets",
        index: true,
      },
      tokenLogId: {
        type: Schema.Types.ObjectId,
        ref: "token-logs",
        index: true,
      },
      conversationId: {
        type: String,
      },
      status: {
        type: String,
        index: true,
        enum: {
          values: Object.values(WalletTransactionStatus),
          message: "Unsupported wallet transaction status {VALUE}",
        },
        default: WalletTransactionStatus.PENDING,
      },
      type: {
        type: String,
        enum: {
          values: Object.values(WalletTransactionType),
          message: "Unsupported wallet transaction type {VALUE}",
        },
        default: WalletTransactionType.DEBIT,
      },
      category: {
        type: String,
        enum: {
          values: Object.values(WalletTransactionCategory),
          message: "Unsupported wallet transaction category {VALUE}",
        },
      },
      reference: {
        type: String,
        required: true,
        index: true,
        unique: true,
      },
      description: {
        type: String,
        enum: {
          values: Object.values(WalletTransactionDescription),
          message: "Unsupported wallet transaction description",
        },
      },
      rollbackReference: {
        type: String,
        index: true,
      },
      meta: {
        type: Map,
        of: Schema.Types.Mixed,
      },
      isRolledback: {
        type: Boolean,
      },
    },
    {
      timestamps: true,
      autoIndex: true,
      toJSON: {
        virtuals: true,
        versionKey: false,
      },
      toObject: { virtuals: true },
    }
  );

WalletTransactionSchema.index({
  status: "text",
  reference: "text",
  type: "text",
  amount: "text",
  businessId: "text",
  category: "text",
});

WalletTransactionSchema.virtual("user", {
  ref: "users",
  localField: "businessId",
  foreignField: "_id",
  justOne: true,
});

WalletTransactionSchema.virtual("transaction", {
  ref: "transactions",
  localField: "reference",
  foreignField: "reference",
  justOne: true,
});

WalletTransactionSchema.virtual("tokenUsageMeta", {
  ref: "token-logs",
  localField: "tokenLogId",
  foreignField: "_id",
  justOne: true,
});

function autoPopulate(this: IWalletTransaction, next: Function) {
  this.populate("user");
  this.populate("transaction");
  this.populate("tokenUsageMeta");
  next();
}

WalletTransactionSchema.pre("find", autoPopulate);
WalletTransactionSchema.pre("findOne", autoPopulate);
WalletTransactionSchema.pre("findOneAndUpdate", autoPopulate);

export const WalletTransaction: Model<IWalletTransaction> =
  model<IWalletTransaction>(collectionName, WalletTransactionSchema);
