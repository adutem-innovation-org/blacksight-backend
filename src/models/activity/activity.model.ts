import { ActivityActionsEnum } from "@/enums";
import { Document, Types, Schema, Model, model } from "mongoose";

export interface IActivity extends Document<Types.ObjectId> {
  action: ActivityActionsEnum;
  title: string;
  description: string;
  // meta: Types.Map<any>;
}

const ActivitySchema: Schema<IActivity> = new Schema<IActivity>(
  {
    action: {
      type: String,
      required: [true, "Please provide activity action"],
      enum: {
        values: Object.values(ActivityActionsEnum),
        message: "Unsupported activity tag {{VALUE}}",
      },
    },
    title: {
      type: String,
      required: [true, "Please provide activity title"],
    },
    description: {
      type: String,
      required: [true, "Please provide activity description"],
    },
    // meta: {
    //   type: Map,
    //   of: Schema.Types.Mixed,
    // },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

export const Activity: Model<IActivity> = model<IActivity>(
  "activities",
  ActivitySchema
);
