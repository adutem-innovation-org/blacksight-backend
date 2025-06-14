import { ConversationMode, RoleEnum } from "@/enums";
import { formatDuration, intervalToDuration } from "date-fns";
import { Document, Types, Schema, model, Model } from "mongoose";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";
import { IBot } from "../bots";
const collectionName = "conversations";
export interface IMessage {
  role: RoleEnum;
  content: string;
  createdAt?: Date;
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
  bot?: IBot;
  mode: ConversationMode;
  duration?: string; // Virtual field
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

ConversationSchema.virtual("duration").get(function (this: IConversation) {
  if (!this.messages || this.messages.length < 2) return "0s";

  const first = this.messages[0]?.createdAt;
  const last = this.messages[this.messages.length - 1]?.createdAt;

  if (!first || !last) return "0s";

  const { hours, minutes, seconds } = intervalToDuration({
    start: first,
    end: last,
  });

  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds ?? 0}s`);

  return parts.join(" ");

  //   return (
  //   formatDuration(duration, { format: ["hours", "minutes", "seconds"] }) ||
  //   "0s"
  // );
});

ConversationSchema.virtual("bot", {
  ref: "bots",
  localField: "botId",
  foreignField: "_id",
  justOne: true,
  options: {
    select: "name status",
  },
});

// Schema lean virtual plugins to populate virtauls even in lean mode (Pagination Service)
ConversationSchema.plugin(mongooseLeanVirtuals);

export const Conversation: Model<IConversation> = model<IConversation>(
  collectionName,
  ConversationSchema
);
