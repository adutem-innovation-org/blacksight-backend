import {TemplateCategory, TemplateType} from "@/enums";
import {Document, Model, model, Schema, Types} from "mongoose";

export interface IEmailTemplate extends Document<Types.ObjectId> {
    id: string;
    name: string;
    description: string;
    type: TemplateType;
    category: TemplateCategory;
    html: string;
    design: Types.Map<any>;
    preview?: string;
    dynamicFields: string[];
    keywords: string[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const EmailTemplateSchema: Schema<IEmailTemplate> = new Schema<IEmailTemplate>(
    {
        name: {type: String, required: [true, "Please provide template name"]},
        description: {
            type: String,
            required: [true, "Please provide template description"],
        },
        type: {
            type: String,
            enum: {
                values: Object.values(TemplateType),
                message: "Invalid template type",
            },
            default: TemplateType.EMAIL,
            required: [true, "Please provide template type"],
        },
        category: {
            type: String,
            enum: {
                values: Object.values(TemplateCategory),
                message: "Invalid template category",
            },
            default: TemplateCategory.PAYMENT,
            required: [true, "Please provide template category"],
        },
        html: {
            type: String,
            required: [true, "Please provide template contents"],
        },
        design: {
            type: Map,
            of: Schema.Types.Mixed
        },
        preview: {type: String},
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
            required: [true, "Please provide creator ID"],
        },
    },
    {
        timestamps: true,
        autoIndex: true,
        toJSON: {virtuals: true, versionKey: false},
        toObject: {virtuals: true, versionKey: false},
    }
);

export const EmailTemplate: Model<IEmailTemplate> = model<IEmailTemplate>(
    "email-templates",
    EmailTemplateSchema
);
