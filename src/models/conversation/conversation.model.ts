import { MessageEnum } from "@/enums";
import { Document, Types, Schema, model, Model } from "mongoose";
const collectionName = "conversations";
interface IMessage extends Document<Types.ObjectId> {
  type: MessageEnum;
  prompt: string;
  response: string;
}

export interface IConversation extends Document<Types.ObjectId> {
  businessId: Types.ObjectId;
  customerId: Types.UUID;
  messages: IMessage[];
}

const MessageSchema: Schema<IMessage> = new Schema<IMessage>(
  {
    type: {
      type: String,
      required: [true, "Please specify message type"],
      enum: {
        values: Object.values(MessageEnum),
        message: "Unsupported message type",
      },
    },
    prompt: {
      type: String,
      required: [
        function () {
          return this.type === MessageEnum.PROMPT;
        },
        "Prompt is required",
      ],
      trim: true,
    },
    response: {
      type: String,
      required: [
        function () {
          return this.type === MessageEnum.RESPONSE;
        },
        "Response is required",
      ],
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
    toObject: {
      virtuals: true,
    },
  }
);

const ConversationSchema: Schema<IConversation> = new Schema<IConversation>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provide owner id"],
      ref: "users",
    },
    customerId: {
      type: Schema.Types.UUID,
      required: [true, "Please provider customer id"],
    },
    messages: {
      types: [MessageSchema],
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
