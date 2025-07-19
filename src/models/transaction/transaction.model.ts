import { PaymentProviders, TransactionStatus } from "@/enums";
import { Schema, Document, Types, Model, model } from "mongoose";

// Interfaces
export interface ITransaction extends Document {
  _id: Types.ObjectId;
  id: string;
  amount: number;
  meta: Types.Map<any>;
  businessId: Types.ObjectId;
  stripePayemntId: string;
  status: TransactionStatus;
  provider: PaymentProviders;
  reference: string;
  paidAt?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const TransactionSchema: Schema<ITransaction> = new Schema<ITransaction>(
  {
    amount: {
      type: Number,
      required: [true, "Missing transaction amount"],
    },
    meta: { type: Map, of: Schema.Types.Mixed },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
      required: [true, "Missing business id"],
    },
    stripePayemntId: {
      type: String,
      required: [true, "Missing payment id"],
      unique: [true, "Duplicate payment identified"],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TransactionStatus),
        message: "Unsupported transaction status {STATUS}",
      },
      default: TransactionStatus.PENDING,
      index: true,
    },
    provider: {
      type: String,
      enum: {
        values: Object.values(PaymentProviders),
        message: "Unsupported provider {VALUE}",
      },
      required: [true, "Missing payment provider"],
    },
    reference: { type: String, unique: true, required: true, index: true },
    paidAt: { type: Date },
    description: { type: String },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: {
      virtuals: true,
      transform: (_, returnedObject) => {
        delete returnedObject.__v;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes
TransactionSchema.index({
  status: "text",
  reference: "text",
  paidAt: "text",
  amount: "text",
});

// Virtuals
TransactionSchema.virtual("user", {
  ref: "users",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Model
export const Transaction: Model<ITransaction> = model<ITransaction>(
  "transactions",
  TransactionSchema
);
