import { CompanySize, PreferredContactMethodEnum, UserRole } from "@/enums";
import { emailRegex, urlRegex } from "@/utils";
import { Document, Types, Schema, Model, model } from "mongoose";
const collectionName = "businesses";

export interface IBusiness extends Document<Types.ObjectId> {
  role: UserRole;

  name: string;
  website: string;
  address: string;

  industry: string;
  numberOfEmployees: CompanySize;
  primaryGoal?: string;

  leadSource: string;
  preferredFeature?: string;

  preferredContentType?: string[];
  feedbackCallConsent: string;
  preferredContactMethod?: PreferredContactMethodEnum;
  contactInfo?: string;
  receiveUpdates: boolean;

  ownerId: Types.ObjectId;
  businessId: string;

  contactName: string;
  contactEmail: string;
  contactTel: string;
  // objectives: string[];
  // companyStructure: string;
}

const BusinessSchema: Schema<IBusiness> = new Schema<IBusiness>(
  {
    role: {
      type: String,
      required: [true, "Please select a role"],
      enum: {
        values: Object.values(UserRole),
        message: "Please select a valid role",
      },
    },

    // About business
    name: {
      type: String,
      required: [true, "Please provide your business name"],
      trim: true,
    },
    website: {
      type: String,
      required: [true, "Please provide your business website"],
      match: [urlRegex, "A valid business website is required"],
    },
    address: {
      type: String,
      required: [true, "Please provide your business address"],
      trim: true,
    },

    // Personalization
    industry: {
      type: String,
      required: [true, "Please specify your business's industry"],
    },
    numberOfEmployees: {
      type: String,
      required: [
        true,
        "Please specify the number of employees in your business",
      ],
      enum: {
        values: Object.values(CompanySize),
        message: "Please select a valid company size",
      },
    },
    primaryGoal: {
      type: String,
      trim: true,
    },

    // Product feedback
    leadSource: {
      type: String,
      required: [true, "Please tell us how you found out about us?"],
    },
    preferredFeature: {
      type: String,
      trim: true,
    },

    // Marketing and Communication Preference
    preferredContentType: {
      type: [String],
    },
    feedbackCallConsent: {
      type: String,
      required: [true, "Please specify if you consent to feedback call"],
    },
    preferredContactMethod: {
      type: String,
      required: [
        function () {
          return this.feedbackCallConsent === "Yes";
        },
        "Please select a preferred contact method",
      ],
      enum: {
        values: Object.values(PreferredContactMethodEnum),
        message: "Unsupported contact method",
      },
    },
    contactInfo: {
      type: String,
      required: [
        function () {
          return this.feedbackCallConsent === "Yes";
        },
        "Please provide contact information",
      ],
      validate: {
        validator: function (value) {
          return this.preferredContactMethod ===
            PreferredContactMethodEnum.EMAIL
            ? emailRegex.test(value)
            : true;
        },
        message: "Please provide a valid contact email",
      },
    },
    receiveUpdates: {
      type: Boolean,
      default: false,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      required: [true, "Business owner id required"],
      ref: "users",
    },
    businessId: {
      type: String,
      required: [true, "Business id required"],
    },

    contactName: {
      type: String,
    },
    contactEmail: {
      type: String,
      matches: [emailRegex, "A valid contact email is required"],
    },
    contactTel: {
      type: String,
    },
    // objectives: {
    //   type: [String],
    // },
    // companyStructure: {
    //   type: String,
    // },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false, virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Business: Model<IBusiness> = model<IBusiness>(
  collectionName,
  BusinessSchema
);
