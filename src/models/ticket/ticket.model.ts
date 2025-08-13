import { Model, model, Schema, Types } from "mongoose";
import { Document } from "mongoose";
import { TicketPriority, TicketRoleEnum, TicketStatus } from "@/enums";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

export interface ITicketMessage {
  role: TicketRoleEnum;
  content: string;
  createdAt?: Date;
}

const MessageSchema: Schema<ITicketMessage> = new Schema<ITicketMessage>(
  {
    role: {
      type: String,
      required: [true, "Please specify role"],
      enum: {
        values: Object.values(TicketRoleEnum),
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

export interface ITicket extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  botId: Types.ObjectId;
  sessionId: string;
  customerEmail: string;
  customerName: string;
  messages: ITicketMessage[];
  status: TicketStatus;
  priority: TicketPriority;
  closedBy: Types.ObjectId;
  closedOn: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema: Schema<ITicket> = new Schema<ITicket>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: [true, "Business id is required"],
      ref: "users",
    },
    botId: {
      type: Schema.Types.ObjectId,
      required: [true, "Bot id is required"],
      ref: "bots",
    },
    sessionId: {
      type: String,
      required: [true, "Session id is required"],
    },
    customerEmail: {
      type: String,
      required: [true, "Customer email is required"],
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
    },
    messages: {
      type: [MessageSchema],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TicketStatus),
        message: "Unsupported ticket status {STATUS}",
      },
      default: TicketStatus.OPEN,
      required: [true, "Ticket status is required"],
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(TicketPriority),
        message: "Unsupported ticket priority {PRIORITY}",
      },
      default: TicketPriority.LOW,
      required: [true, "Ticket priority is required"],
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: "admins",
    },
    closedOn: {
      type: Date,
    },
  },
  {
    timestamps: true,
    autoIndex: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
    },
    toObject: {
      virtuals: true,
      versionKey: false,
    },
  }
);

TicketSchema.virtual("bot", {
  ref: "bots",
  localField: "botId",
  foreignField: "_id",
  justOne: true,
  options: {
    select: "name status",
  },
});

TicketSchema.plugin(mongooseLeanVirtuals);

TicketSchema.on("find", populateVirtuals);
TicketSchema.on("findOne", populateVirtuals);
TicketSchema.on("findOneAndUpdate", populateVirtuals);

function populateVirtuals(this: any, next: Function) {
  this.populate("bot");
  next();
}

export const Ticket: Model<ITicket> = model<ITicket>("tickets", TicketSchema);
