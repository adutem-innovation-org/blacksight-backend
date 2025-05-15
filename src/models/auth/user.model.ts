import { UserTypes } from "@/enums";
import { emailRegex } from "@/utils";
import { Schema, Model, model, Document, Types } from "mongoose";
import { compare, genSalt, hash } from "bcryptjs";
import { BYTE_LENGTH } from "@/constants";
const collectionName = "users";

export interface IUser extends Document<Types.ObjectId> {
  firstName: string;
  lastName: string;
  email: string;
  hash: string;
  salt: string;
  pushToken: string;
  passwordChangedAt: Date;
  deletedAt: Date;
  lastLogin: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  google: string;
  imageUrl: string;
  isSuperAdmin: boolean;
  userType: UserTypes.ADMIN | UserTypes.USER | UserTypes.MERCHANT;
  hasConnectedGoogleMeet: boolean;
  hasConnectedZoomMeet: boolean;
  setPassword(password: string): Promise<void>;
  validatePassword(password: string): Promise<boolean>;
}

export const UserSchema: Schema<IUser> = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: [true, "Please provide firstname"],
    },
    lastName: {
      type: String,
      trim: true,
      required: [true, "Please provide lastname"],
    },
    email: {
      type: String,
      unique: [true, "User with email already exist"],
      required: [true, "Please provide email"],
      match: [emailRegex, "Invalid email"],
      trim: true,
      lowercase: true,
    },
    hash: {
      type: String,
      trim: true,
    },
    salt: {
      type: String,
    },
    pushToken: {
      type: String,
    },
    passwordChangedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    google: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    userType: {
      type: String,
      default: UserTypes.USER,
      immutable: true,
      enum: {
        values: Object.values(UserTypes),
        message: "Unsupported user type {{VALUE}}",
      },
    },
    hasConnectedGoogleMeet: {
      type: Boolean,
      default: false,
    },
    hasConnectedZoomMeet: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: {
      versionKey: false,
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

UserSchema.index({
  email: "text",
  firstName: "text",
  lastName: "text",
});

/**
 * Setup document method for password encryption
 * @param password
 */
UserSchema.methods.setPassword = async function (password: string) {
  this.salt = await genSalt(BYTE_LENGTH);
  this.hash = await hash(password, this.salt);
  this.passwordChangedAt = new Date();
  return true;
};

UserSchema.methods.validatePassword = async function (password: string) {
  if (!this.salt || !this.hash) return false;
  return await compare(password, this.hash);
};

export const User: Model<IUser> = model<IUser>(collectionName, UserSchema);
