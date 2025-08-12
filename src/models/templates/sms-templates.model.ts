import { TemplateCategory, TemplateType } from "@/enums";
import { Document, Types, Model, model, Schema } from "mongoose";

export interface ISMSTemplate extends Document<Types.ObjectId> {
  id: string;
  name: string;
  description: string;
  type: TemplateType.SMS;
  category: TemplateCategory;
  content: string;
  dynamicFields: string[];
  keywords: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SMSTemplateSchema: Schema<ISMSTemplate> = new Schema<ISMSTemplate>(
  {
    name: { type: String, required: [true, "Please provide template name"] },
    description: {
      type: String,
      required: [true, "Please provide template description"],
    },
    type: {
      type: String,
      enum: {
        values: [TemplateType.SMS],
        message: "Unsupported template type",
      },
      default: TemplateType.SMS,
      required: [true, "Please provide template type"],
    },
    category: {
      type: String,
      enum: {
        values: Object.values(TemplateCategory),
        message: "Invalid template category",
      },
      required: [true, "Please provide template category"],
    },
    content: { type: String, required: [true, "Template content is required"] },
    dynamicFields: {
      type: [String],
      required: [true, "Please provide template dynamic fields"],
    },
    keywords: {
      type: [String],
      required: [true, "Please provide template keywords"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Please provide creator ID"],
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  }
);

export const SMSTemplate: Model<ISMSTemplate> = model<ISMSTemplate>(
  "sms-templates",
  SMSTemplateSchema
);
