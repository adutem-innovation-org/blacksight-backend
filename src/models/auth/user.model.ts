import { UserTypes } from "@/enums";
import { emailRegex } from "@/utils";
import { Schema, Model, model, Document, Types } from "mongoose";
import { compare, genSalt, hash } from "bcryptjs";
import { BYTE_LENGTH } from "@/constants";
import { randomUUID } from "crypto";
const collectionName = "users";

export interface IAddressInfo {
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
}

export interface IUser extends Document<Types.ObjectId> {
  businessId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  hash: string;
  salt: string;
  pushToken: string;
  passwordChangedAt: Date;
  deletedAt: Date;
  lastLogin: Date;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspensionId?: Types.ObjectId;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  skippedOnboarding: boolean;
  google: string;
  imageUrl: string;
  isSuperAdmin: boolean;
  userType: UserTypes.ADMIN | UserTypes.USER | UserTypes.MERCHANT;
  addressInfo: IAddressInfo;
  hasConnectedGoogleMeet: boolean;
  hasConnectedCalCom: boolean;
  walletId: Types.ObjectId;
  setPassword(password: string): Promise<void>;
  validatePassword(password: string): Promise<boolean>;
}

export const UserSchema: Schema<IUser> = new Schema(
  {
    businessId: {
      type: String,
      default: randomUUID,
    },
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
    phone: {
      type: String,
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
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
    },
    suspensionId: {
      type: Schema.Types.ObjectId,
      ref: "suspension-logs",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    skippedOnboarding: {
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
    addressInfo: {
      country: {
        type: String,
      },
      state: {
        type: String,
      },
      city: {
        type: String,
      },
      zipCode: {
        type: String,
      },
    },
    hasConnectedGoogleMeet: {
      type: Boolean,
      default: false,
    },
    hasConnectedCalCom: {
      type: Boolean,
      default: false,
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "wallets",
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

UserSchema.virtual("businessInfo", {
  ref: "businesses",
  localField: "businessId",
  foreignField: "businessId",
  justOne: true,
});

UserSchema.virtual("wallet", {
  ref: "wallets",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

function autoPopulate(this: IUser, next: Function) {
  this.populate("businessInfo");
  this.populate("wallet");
  next();
}

UserSchema.pre("find", autoPopulate);
UserSchema.pre("findOne", autoPopulate);
UserSchema.pre("findOneAndUpdate", autoPopulate);

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
