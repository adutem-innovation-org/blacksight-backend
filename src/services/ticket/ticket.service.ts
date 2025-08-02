import { TicketRoleEnum, TicketStatus, TTL } from "@/enums";
import {
  isUser,
  throwNotFoundError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { AuthData } from "@/interfaces";
import { ITicket, Ticket } from "@/models";
import { CacheService, PaginationService } from "@/utils";
import { Model, Types } from "mongoose";

export class TicketService {
  private static instance: TicketService;

  private readonly ticketModel: Model<ITicket> = Ticket;

  private readonly cacheService: CacheService;
  private readonly paginationService: PaginationService<ITicket>;

  constructor() {
    this.cacheService = CacheService.getInstance();
    this.paginationService = new PaginationService(this.ticketModel);
  }

  static getInstance(): TicketService {
    if (!this.instance) {
      this.instance = new TicketService();
    }
    return this.instance;
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

  async getTicket(authData: AuthData, id: string) {
    const ticket = await this.ticketModel.findOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(authData.userId),
    });
    if (!ticket) return throwNotFoundError("Ticket not found");
    return { ticket, message: "Ticket found successfully" };
  }

  async getTickets(authData: AuthData, query: any) {
    const queryObj: Record<string, any> = {};

    if (isUser(authData))
      queryObj["businessId"] = new Types.ObjectId(authData.userId);

    if (query.status) queryObj["status"] = query.status;

    if (query.customerEmail) queryObj["customerEmail"] = query.customerEmail;

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
