import { PaymentInterval } from "@/enums";
import { Document, Model, Schema, model, Types } from "mongoose";

export interface IBusinessCustomerPayment extends Document<Types.ObjectId> {
  fileId: Types.ObjectId; // The _id of the file from which it was populated
  name: string;
  email: string;
  phone?: string;
  paymentInterval: PaymentInterval;
  lastPayment: Date;
  nextPayment: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessCustomerPaymentSchema: Schema<IBusinessCustomerPayment> =
  new Schema<IBusinessCustomerPayment>(
    {
      fileId: {
        type: Schema.Types.ObjectId,
        required: [true, "Please provide file id"],
        ref: "payment-files",
      },
      name: {
        type: String,
        required: [true, "Please provide name"],
      },
      email: {
        type: String,
        required: [true, "Please provide email"],
      },
      phone: {
        type: String,
      },
      paymentInterval: {
        type: String,
        required: [true, "Please provide payment interval"],
        enum: {
          values: Object.values(PaymentInterval),
          message: "Unsupported payment interval",
        },
      },
      lastPayment: {
        type: Date,
        required: [true, "Please provide last payment"],
      },
      nextPayment: {
        type: Date,
        required: [true, "Please provide next payment"],
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true, versionKey: false },
      toObject: { virtuals: true },
    }
  );

export const BusinessCustomerPayment: Model<IBusinessCustomerPayment> =
  model<IBusinessCustomerPayment>(
    "business-customer-payments",
    BusinessCustomerPaymentSchema
  );
