import { PaymentInterval } from "@/enums";
import { Document, Model, Schema, model, Types } from "mongoose";
import { Business, IUser } from "../auth";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

export interface IBusinessCustomerPayment extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  uploadedBy?: Pick<IUser, "firstName" | "lastName" | "email">;
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
      userId: {
        type: Schema.Types.ObjectId,
        required: [true, "Please provide business identifier"],
        ref: "users",
      },
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

BusinessCustomerPaymentSchema.virtual("uploadedBy", {
  ref: "users",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
  options: {
    select: "firstName lastName email",
    lean: true,
  },
});

BusinessCustomerPaymentSchema.plugin(mongooseLeanVirtuals);

function autoPopulate(this: any, next: Function) {
  this.populate("uploadedBy");
  next();
}

BusinessCustomerPaymentSchema.pre("find", autoPopulate);
BusinessCustomerPaymentSchema.pre("findOne", autoPopulate);
BusinessCustomerPaymentSchema.pre("findOneAndUpdate", autoPopulate);

export const BusinessCustomerPayment: Model<IBusinessCustomerPayment> =
  model<IBusinessCustomerPayment>(
    "business-customer-payments",
    BusinessCustomerPaymentSchema
  );
