import { Document, Types, Model, model, Schema } from "mongoose";
const collectionName = "knowledge-bases";

export interface IKnowledgeBase extends Document<Types.ObjectId> {
  tag: string;
  businessId: Types.ObjectId;
  documentId: Types.ObjectId;
  chunkId: number;
  text: string;
  metadata: Types.Map<any>;
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
    chunkId: {
      type: Number,
      required: [true, "Chunk id is required"],
    },
    text: {
      type: String,
      required: [true, "Chunk text is required"],
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

export const KnowledgeBase: Model<IKnowledgeBase> = model<IKnowledgeBase>(
  collectionName,
  KnowledgeBaseSchema
);
