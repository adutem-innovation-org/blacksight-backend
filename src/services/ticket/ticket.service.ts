import {
  TicketPriority,
  TicketRoleEnum,
  TicketStatus,
  TTL,
  UserTypes,
} from "@/enums";
import {
  isUser,
  throwNotFoundError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { AuthData } from "@/interfaces";
import { ITicket, Ticket } from "@/models";
import { CacheService, MailgunEmailService, PaginationService } from "@/utils";
import { Model, Types } from "mongoose";

export class TicketService {
  private static instance: TicketService;

  private readonly ticketModel: Model<ITicket> = Ticket;
  private readonly emailService: MailgunEmailService;

  private readonly cacheService: CacheService;
  private readonly paginationService: PaginationService<ITicket>;

  constructor() {
    this.cacheService = CacheService.getInstance();
    this.paginationService = new PaginationService(this.ticketModel);
    this.emailService = MailgunEmailService.getInstance();
  }

  static getInstance(): TicketService {
    if (!this.instance) {
      this.instance = new TicketService();
    }
    return this.instance;
  }

  async analytics(auth: AuthData) {
    let query: Record<string, any> = {};
    if (auth.userType === UserTypes.USER) {
      query = { businessId: new Types.ObjectId(auth.userId) };
    }

    const result = await Promise.allSettled([
      this.ticketModel
        .countDocuments({ status: TicketStatus.OPEN, ...query })
        .exec(),
      this.ticketModel
        .countDocuments({ status: TicketStatus.IN_PROGRESS, ...query })
        .exec(),
      this.ticketModel
        .countDocuments({ status: TicketStatus.RESOLVED, ...query })
        .exec(),
      this.ticketModel
        .countDocuments({ status: TicketStatus.CLOSED, ...query })
        .exec(),
    ]);

    return {
      data: {
        openTickets: result[0].status === "fulfilled" ? result[0].value : 0,
        inProgressTickets:
          result[1].status === "fulfilled" ? result[1].value : 0,
        resolvedTickets: result[2].status === "fulfilled" ? result[2].value : 0,
        closedTickets: result[3].status === "fulfilled" ? result[3].value : 0,
      },
    };
  }

  async openOrUpdateTicket({
    businessId,
    botId,
    sessionId,
    customerEmail,
    customerName,
    message,
  }: {
    businessId: string;
    botId: string;
    sessionId: string;
    customerEmail: string;
    customerName: string;
    message: string;
  }) {
    if (!message)
      return throwUnprocessableEntityError("Please provide message");

    const newTicketMessage = {
      role: TicketRoleEnum.USER,
      content: message,
    };

    const alreadyExist = await this.ticketModel.exists({
      sessionId,
      botId,
      businessId,
      status: {
        $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
      },
    });

    const ticket = await this.ticketModel.findOneAndUpdate(
      {
        sessionId,
        botId,
        businessId,
        status: {
          $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
        },
        customerEmail,
      },
      { businessId, sessionId, botId, customerEmail, customerName },
      { upsert: true, new: true }
    );

    if (ticket) {
      ticket.messages.push(newTicketMessage);
      await ticket.save();
    }

    if (!alreadyExist) {
      if (ticket.customerEmail) {
        try {
          await this.emailService.send({
            message: {
              text: `Hi ${ticket.customerName.split(" ")[0] || "there"}!👋,
          \n\nWe have received your message.
          \n\nWe will write back to you shorty
          \n\nThis email will contain more details in the future.
          \n\nYour ticket ID is: ${ticket._id}`,
              to: ticket.customerEmail,
              subject: `Reply to your ticket. #${ticket._id}`,
            },
            template: "ticket-creation",
            locals: {
              customerName: ticket.customerName.split(" ")[0] || "there",
              customerEmail: ticket.customerEmail,
              ticketId: ticket._id,
              subject: `Reply to your ticket. #${ticket._id}`,
              message,
              timestamp: new Date().toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
            },
          });
        } catch (error) {}
      }
    }

    return ticket;
  }

  async closeTicket(authData: AuthData, ticketId: string) {
    const ticket = await this.ticketModel.findByIdAndUpdate(
      ticketId,
      {
        status: TicketStatus.CLOSED,
        closedBy: new Types.ObjectId(authData.userId),
        closedOn: new Date(),
      },
      { new: true }
    );

    if (!ticket) return throwNotFoundError("Ticket not found");

    return { ticket, message: "Ticket closed successfully" };
  }

  async updateTicketStatus(
    authData: AuthData,
    ticketId: string,
    status: TicketStatus
  ) {
    const queryObj: Record<string, any> = {
      _id: new Types.ObjectId(ticketId),
    };

    if (isUser(authData))
      queryObj["businessId"] = new Types.ObjectId(authData.userId);

    const ticket = await this.ticketModel.findOneAndUpdate(
      queryObj,
      {
        status,
        closedBy: new Types.ObjectId(authData.userId),
        closedOn: new Date(),
      },
      { new: true }
    );

    if (!ticket) return throwNotFoundError("Ticket not found");

    return { ticket, message: "Ticket updated successfully" };
  }

  async updateTicketPriority(
    authData: AuthData,
    ticketId: string,
    priority: TicketPriority
  ) {
    const queryObj: Record<string, any> = {
      _id: new Types.ObjectId(ticketId),
    };

    if (isUser(authData))
      queryObj["businessId"] = new Types.ObjectId(authData.userId);

    const ticket = await this.ticketModel.findOneAndUpdate(
      queryObj,
      {
        priority,
      },
      { new: true }
    );

    if (!ticket) return throwNotFoundError("Ticket not found");

    return { ticket, message: "Ticket updated successfully" };
  }

  async getTicket(authData: AuthData, id: string) {
    const ticket = await this.ticketModel.findOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(authData.userId),
    });
    if (!ticket) return throwNotFoundError("Ticket not found");
    return { ticket, message: "Ticket found successfully" };
  }

  async getTickets(authData: AuthData, query?: any) {
    const queryObj: Record<string, any> = {};

    if (isUser(authData))
      queryObj["businessId"] = new Types.ObjectId(authData.userId);

    if (query?.status) queryObj["status"] = query.status;

    if (query?.customerEmail) queryObj["customerEmail"] = query.customerEmail;

    return await this.paginationService.paginate(
      { query: queryObj, populate: ["bot"], sort: { createdAt: -1 } },
      []
    );
  }

  async replyTicket(authData: AuthData, id: string, message: string) {
    const queryObj: Record<string, any> = {
      _id: new Types.ObjectId(id),
    };

    if (isUser(authData))
      queryObj["businessId"] = new Types.ObjectId(authData.userId);

    const ticket = await this.ticketModel.findOneAndUpdate(
      queryObj,
      {
        $push: { messages: { role: TicketRoleEnum.SUPPORT, content: message } },
      },
      { new: true }
    );

    if (!ticket) return throwNotFoundError("Ticket not found");

    if (ticket.status !== TicketStatus.RESOLVED)
      ticket.status = TicketStatus.IN_PROGRESS;
    await ticket.save();

    if (ticket.customerEmail) {
      try {
        await this.emailService.send({
          message: {
            text: `Hi ${ticket.customerName.split(" ")[0] || "there"}!👋,
          \n\nThere is an update on your ticket.
          \n\nThis email will contain more details in the future.
          \n\nReply from support: ${message}
          \n\nYour ticket ID is: ${ticket._id}`,
            to: ticket.customerEmail,
            subject: `Reply to your ticket. #${ticket._id}`,
          },
          template: "ticket-reply",
          locals: {
            customerName: ticket.customerName.split(" ")[0] || "there",
            customerEmail: ticket.customerEmail,
            ticketId: ticket._id,
            message,
          },
        });
      } catch (error) {}
    }

    return { ticket, message: "Ticket updated successfully" };
  }

  async getCustomerTicket(ticketId: string) {
    const ticket = await this.ticketModel.findOne({
      _id: new Types.ObjectId(ticketId),
    });
    if (!ticket) return throwNotFoundError("Ticket not found");
    return { ticket, message: "Ticket found successfully" };
  }

  async customerReplyTicket(ticketId: string, message: string) {
    const ticket = await this.ticketModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(ticketId),
      },
      {
        $push: { messages: { role: TicketRoleEnum.USER, content: message } },
      },
      { new: true }
    );

    if (!ticket) return throwNotFoundError("Ticket not found");

    return { ticket, message: "Ticket updated successfully" };
  }

  async deleteTicket(authData: AuthData, id: string) {
    const queryObj: Record<string, any> = {
      _id: new Types.ObjectId(id),
    };

    if (isUser(authData))
      queryObj["businessId"] = new Types.ObjectId(authData.userId);

    const ticket = await this.ticketModel.findOneAndDelete(queryObj);

    if (!ticket) return throwNotFoundError("Ticket not found");

    return { ticket, message: "Ticket deleted successfully" };
  }
}
