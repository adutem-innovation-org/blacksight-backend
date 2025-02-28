import { UserTypes } from "@/enums";
import { IUser, UserSchema } from "./user.model";
import { model, Model, Schema } from "mongoose";
const collectionName = "merchants";

export interface IMerchant extends IUser {
  userType: UserTypes.MERCHANT;
}

const MerchantSchema: Schema<IMerchant> = UserSchema.clone();

MerchantSchema.add({
  userType: {
    type: String,
    default: UserTypes.MERCHANT,
    immutable: true,
    enum: {
      values: Object.values(UserTypes),
      message: "Unsupported user type {VALUE}",
    },
  },
});

MerchantSchema.clearIndexes();

MerchantSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
});

export const Merchant: Model<IMerchant> = model<IMerchant>(
  collectionName,
  MerchantSchema
);
