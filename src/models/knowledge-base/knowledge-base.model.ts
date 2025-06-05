import { Document, Types, Model, model, Schema } from "mongoose";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";
const collectionName = "knowledge-bases";

type Chunk = {
  chunkId: number;
  text: string;
};

const ChunkSchema: Schema<Chunk> = new Schema<Chunk>({
  chunkId: {
    type: Number,
    required: [true, "Please provide chunk id"],
  },
  text: {
    type: String,
  },
});
export interface IKnowledgeBase extends Document<Types.ObjectId> {
  tag: string;
  businessId: Types.ObjectId;
  documentId: Types.ObjectId;
  chunks: Array<Chunk>;
  isActive: boolean;
}

const KnowledgeBaseSchema: Schema<IKnowledgeBase> = new Schema<IKnowledgeBase>(
  {
    tag: {
      type: String,
      required: [true, "Knowledge base tag is required"],
    },
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Business id is required"],
      ref: "users",
    },
    documentId: {
      type: Schema.Types.ObjectId,
      required: [true, "Document id is required"],
    },
    chunks: {
      type: [ChunkSchema],
      default: undefined,
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

KnowledgeBaseSchema.virtual("connectedBots", {
  ref: "bots",
  localField: "_id",
  foreignField: "knowledgeBaseId",
  options: {
    select: "name _id status",
    lean: true,
  },
});

KnowledgeBaseSchema.plugin(mongooseLeanVirtuals);

export const KnowledgeBase: Model<IKnowledgeBase> = model<IKnowledgeBase>(
  collectionName,
  KnowledgeBaseSchema
);
