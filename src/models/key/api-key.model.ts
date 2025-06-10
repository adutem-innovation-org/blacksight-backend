import { Document, Schema, Types, Model, model } from "mongoose";

export interface IApiKey extends Document<Types.ObjectId> {
  key: string;
  secretKeyEncrypted: string;
  ownerId: Types.ObjectId; // ID of user, business, or service owning the key
  createdBy: Types.ObjectId; // who created the key
  expiresAt?: Date;
  scopes?: string[]; // optional permissions, like ['read:appointments']
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  revoked: boolean;
  disabled: boolean;
  isExpired(): boolean;
}

const apiKeySchema: Schema<IApiKey> = new Schema<IApiKey>(
  {
    key: {
      type: String,
      required: true,
      unique: [true, "Api key must be unique"],
      select: false,
    },
    secretKeyEncrypted: {
      type: String,
      required: [true, "Encrypted secret key required"],
      unique: [true, "Encrypted key must be unique"],
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "users", required: true },
    expiresAt: { type: Date },
    scopes: [{ type: String }],
    revoked: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
  }
);

apiKeySchema.methods.isExpired = function () {
  return !!this.expiresAt && this.expiresAt.getTime() < Date.now();
};

export const ApiKey: Model<IApiKey> = model<IApiKey>("ApiKeys", apiKeySchema);
