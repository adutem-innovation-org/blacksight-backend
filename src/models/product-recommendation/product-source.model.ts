import { KnowledgeBaseSources } from "@/enums";
import { Document, model, Model, Schema, Types } from "mongoose";
import { Chunk, ChunkSchema } from "../knowledge-base";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

export interface IProductSource extends Document<Types.ObjectId> {
  source:
    | KnowledgeBaseSources.FILE
    | KnowledgeBaseSources.TEXT_INPUT
    | KnowledgeBaseSources.API;
  tag: string;
  businessId: Types.ObjectId;
  documentId: Types.ObjectId;
  chunks: Array<Chunk>;
  metaData: Types.Map<any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSourceSchema: Schema<IProductSource> = new Schema<IProductSource>(
  {
    source: {
      type: String,
      required: [true, "Please provide source"],
      enum: {
        values: Object.values(KnowledgeBaseSources),
        message: "Unsupported source",
      },
    },
    tag: {
      type: String,
      required: [true, "Please provide tag"],
    },
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Please provide business id"],
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
    metaData: {
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

ProductSourceSchema.virtual("connectedBots", {
  ref: "bots",
  localField: "_id",
  foreignField: "productSourceId",
  options: {
    select: "name _id status",
    lean: true,
  },
});

ProductSourceSchema.virtual("createdBy", {
  ref: "users",
  localField: "businessId",
  foreignField: "_id",
  justOne: true,
  options: {
    select: "firstName lastName email",
    lean: true,
  },
});

ProductSourceSchema.plugin(mongooseLeanVirtuals);

function autoPopulate(this: any, next: Function) {
  this.populate("connectedBots");
  this.populate("createdBy");
  next();
}

ProductSourceSchema.pre("find", autoPopulate);
ProductSourceSchema.pre("findOne", autoPopulate);
ProductSourceSchema.pre("findOneAndUpdate", autoPopulate);

ProductSourceSchema.post("find", function (docs) {
  docs.forEach((doc: any) => {
    doc.createdBy = {
      firstName: doc.createdBy?.firstName,
      lastName: doc.createdBy?.lastName,
      email: doc.createdBy?.email,
    };
  });
});

export const ProductSource: Model<IProductSource> = model<IProductSource>(
  "product-sources",
  ProductSourceSchema
);
