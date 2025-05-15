import { defaultInstruction } from "@/constants";
import { BotStatus } from "@/enums";
import { Types, Model, model, Schema, Document } from "mongoose";
const collectionName = "bots";

export interface IBot extends Document<Types.ObjectId> {
  businessId: Types.ObjectId;
  knowledgeBaseId: Types.ObjectId;
  name: string;
  instructions: string[];
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
    knowledgeBaseId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provide knowledge base"],
      ref: "knowledge-bases",
    },
    name: {
      type: String,
      required: [true, "Bot name is required"],
    },
    instructions: {
      type: [String],
      default: [defaultInstruction],
    },
    scheduleMeeting: {
      type: Boolean,
      default: false,
    },
    meetingProviderId: {
      type: Schema.Types.ObjectId,
      required: [
        function () {
          return this.scheduleMeeting;
        },
        "Please provide meeting provider",
      ],
      ref: "meeting-providers",
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

BotSchema.virtual("knowledgeBase", {
  ref: "knowledge-bases",
  localField: "knowledgeBaseId",
  foreignField: "_id",
  justOne: true,
  options: {
    select: "tag isActive",
  },
});

function autoPopulateKnowledgeBase(this: any, next: Function) {
  this.populate("knowledgeBase");
  next();
}

BotSchema.pre("find", autoPopulateKnowledgeBase);
BotSchema.pre("findOne", autoPopulateKnowledgeBase);
BotSchema.pre("findOneAndUpdate", autoPopulateKnowledgeBase);

export const Bot: Model<IBot> = model<IBot>(collectionName, BotSchema);
