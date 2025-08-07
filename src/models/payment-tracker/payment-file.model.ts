import { Document, Model, model, Schema } from "mongoose";
import { Types } from "mongoose";
import { IUser } from "../auth";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

export interface IPaymentFile extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  uploadedBy?: Pick<IUser, "firstName" | "lastName" | "email">;
  tag: string; // Tag can also be file name
  fileUrl: string; // If we want to store file on firebase
  createdAt: Date;
  updatedAt: Date;
  metaData: Types.Map<any>; // Metadata such as file name, type, and size.
}

const PaymentFileSchema: Schema<IPaymentFile> = new Schema<IPaymentFile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provide business identifier"],
      ref: "users",
    },
    tag: {
      type: String,
      required: [true, "Please provide file tag"],
    },
    fileUrl: {
      type: String,
    },
    metaData: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

PaymentFileSchema.virtual("uploadedBy", {
  ref: "users",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
  options: {
    select: "firstName lastName email",
    lean: true,
  },
});

PaymentFileSchema.plugin(mongooseLeanVirtuals);

function autoPopulate(this: any, next: Function) {
  this.populate("uploadedBy");
  next();
}

PaymentFileSchema.pre("find", autoPopulate);
PaymentFileSchema.pre("findOne", autoPopulate);
PaymentFileSchema.pre("findOneAndUpdate", autoPopulate);

export const PaymentFile: Model<IPaymentFile> = model<IPaymentFile>(
  "payment-files",
  PaymentFileSchema
);
