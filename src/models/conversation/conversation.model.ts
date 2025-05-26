import { ConversationMode, RoleEnum } from "@/enums";
import { Document, Types, Schema, model, Model } from "mongoose";
const collectionName = "conversations";
export interface IMessage {
  role: RoleEnum;
  content: string;
}

interface ISummary {
  content: string;
  startIndex: number;
  endIndex: number;
}
export interface IConversation extends Document<Types.ObjectId> {
  businessId: Types.ObjectId;
  conversationId: string;
  botId: Types.ObjectId;
  mode: ConversationMode;
  messages: IMessage[];
  summaries: ISummary[];
}

const MessageSchema: Schema<IMessage> = new Schema<IMessage>(
  {
    role: {
      type: String,
      required: [true, "Please specify role"],
      enum: {
        values: Object.values(RoleEnum),
        message: "Unsupported message role",
      },
    },
    content: {
      type: String,
      required: [true, "Please provide message content"],
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
    },
  }
);

const SummarySchema: Schema<ISummary> = new Schema<ISummary>(
  {
    content: {
      type: String,
    },
    startIndex: {
      type: Number,
    },
    endIndex: {
      type: Number,
    },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

const ConversationSchema: Schema<IConversation> = new Schema<IConversation>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provide owner id"],
      ref: "users",
    },
    botId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provide bot id"],
      ref: "bots",
    },
    conversationId: {
      type: String,
    },
    mode: {
      type: String,
      enum: {
        values: Object.values(ConversationMode),
        message: "Unsupported conversation mode {{VALUE}}",
      },
      default: ConversationMode.TRAINING,
    },
    messages: {
      type: [MessageSchema],
    },
    summaries: {
      type: [SummarySchema],
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

export const Conversation: Model<IConversation> = model<IConversation>(
  collectionName,
  ConversationSchema
);
