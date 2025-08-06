import { defaultInstruction, newDefaultInstruction } from "@/constants";
import { BotStatus } from "@/enums";
import { Types, Model, model, Schema, Document } from "mongoose";
import { IKnowledgeBase } from "../knowledge-base";
import { IProductSource } from "../product-recommendation";
const collectionName = "bots";

export interface IBot extends Document<Types.ObjectId> {
  businessId: Types.ObjectId;
  knowledgeBaseIds: Types.ObjectId[];
  knowledgeBases?: IKnowledgeBase[];
  productsSourceIds?: Types.ObjectId[];
  productsSources?: IProductSource[];
  name: string;
  instructions: string;
  welcomeMessage: string;
  scheduleMeeting: boolean;
  meetingProviderId: Types.ObjectId;
  status: BotStatus;
  isActive: boolean;
}

const BotSchema: Schema<IBot> = new Schema<IBot>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Business id is required"],
      ref: "users",
    },
    knowledgeBaseIds: {
      type: [Schema.Types.ObjectId],
      required: [true, "Please provide knowledge base"],
      ref: "knowledge-bases",
    },
    productsSourceIds: {
      type: [Schema.Types.ObjectId],
      ref: "product-sources",
      default: undefined,
    },
    name: {
      type: String,
      required: [true, "Bot name is required"],
    },
    instructions: {
      type: String,
      default: newDefaultInstruction,
    },
    scheduleMeeting: {
      type: Boolean,
      default: false,
    },
    welcomeMessage: {
      type: String,
      // default:
      //   "Hello there! 👋\nWelcome to our page. 🤗\nI'm a chat assistant that can provide you with more information about our business or help you book an appointment.\nWhat can I help you with today?",
      default:
        "Hello there! 👋\nI'm Nova your personal assistant. How can I help you today?",
    },
    meetingProviderId: {
      type: Schema.Types.ObjectId,
      required: [
        function () {
          return this.scheduleMeeting;
        },
        "Please provide meeting provider",
      ],
      ref: "calendar-providers",
    },
    status: {
      type: String,
      enum: {
        values: Object.values(BotStatus),
        message: "Unsupported status",
      },
      default: BotStatus.ACTIVE,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

BotSchema.virtual("knowledgeBases", {
  ref: "knowledge-bases",
  localField: "knowledgeBaseIds",
  foreignField: "_id",
  justOne: false,
  options: {
    select: "tag isActive documentId",
  },
});

BotSchema.virtual("productsSources", {
  ref: "product-sources",
  localField: "productsSourcesIds",
  foreignField: "_id",
  justOne: false,
  options: {
    select: "source tag documentId",
  },
});

function autoPopulateKnowledgeBase(this: any, next: Function) {
  this.populate("knowledgeBases");
  next();
}

BotSchema.pre("find", autoPopulateKnowledgeBase);
BotSchema.pre("findOne", autoPopulateKnowledgeBase);
BotSchema.pre("findOneAndUpdate", autoPopulateKnowledgeBase);

export const Bot: Model<IBot> = model<IBot>(collectionName, BotSchema);
