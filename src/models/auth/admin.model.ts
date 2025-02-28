import { UserTypes } from "@/enums";
import { IUser, UserSchema } from "./user.model";
import { Model, Schema, model } from "mongoose";
import { genSalt, hash } from "bcryptjs";
const collectionName = "admins";

export interface IAdmin extends IUser {
  userType: UserTypes.ADMIN;
}

const AdminSchema: Schema<IAdmin> = UserSchema.clone();
AdminSchema.add({
  userType: {
    type: String,
    default: UserTypes.ADMIN,
    immutable: true,
    enum: {
      values: Object.values(UserTypes),
      message: "Unsupported user type {VALUE}",
    },
  },
});

AdminSchema.clearIndexes();

// AdminSchema.pre<IAdmin>("save", async function (next) {
//   if (!this.isModified("hash")) {
//     return next();
//   }
//   this.salt = await genSalt(10);
//   this.hash = await hash(this.hash, this.salt);
//   next();
// });

export const Admin: Model<IAdmin> = model<IAdmin>(collectionName, AdminSchema);
