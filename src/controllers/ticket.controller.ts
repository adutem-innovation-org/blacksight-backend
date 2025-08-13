import { sendSuccessResponse } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { TicketService } from "@/services";
import { Request, Response } from "express";
import {
  ReplyTicketDto,
  UpdateTicketPriorityDto,
  UpdateTicketStatusDto,
} from "@/decorators";
import { TicketPriority } from "@/enums";

export class TicketController {
  private static instance: TicketController;

  private readonly ticketService: TicketService;

  constructor() {
    this.ticketService = TicketService.getInstance();
  }

  static getInstance(): TicketController {
    if (!this.instance) {
      this.instance = new TicketController();
    }
    return this.instance;
  }

  analytics = async (req: Request, res: Response) => {
    const data = await this.ticketService.analytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getAllTickets = async (req: Request, res: Response) => {
    const data = await this.ticketService.getTickets(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getTicketById = async (req: Request, res: Response) => {
    const data = await this.ticketService.getTicket(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  updateTicketStatus = async (
    req: GenericReq<UpdateTicketStatusDto>,
    res: Response
  ) => {
    const data = await this.ticketService.updateTicketStatus(
      req.authData!,
      req.params.id,
      req.body.status
    );
    return sendSuccessResponse(res, data);
  };

  updateTicketPriority = async (
    req: GenericReq<UpdateTicketPriorityDto>,
    res: Response
  ) => {
    const data = await this.ticketService.updateTicketPriority(
      req.authData!,
      req.params.id,
      req.body.priority
    );
    return sendSuccessResponse(res, data);
  };

  getCustomerTicket = async (req: Request, res: Response) => {
    const data = await this.ticketService.getCustomerTicket(req.params.id);
    return sendSuccessResponse(res, data);
  };

  customerReplyTicket = async (
    req: GenericReq<{ message: string }>,
    res: Response
  ) => {
    const data = await this.ticketService.customerReplyTicket(
      req.params.id,
      req.body.message
    );
    return sendSuccessResponse(res, data);
  };

  deleteTicket = async (req: Request, res: Response) => {
    const data = await this.ticketService.deleteTicket(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  replyTicket = async (req: GenericReq<ReplyTicketDto>, res: Response) => {
    const data = await this.ticketService.replyTicket(
      req.authData!,
      req.params.id,
      req.body.message
    );
    return sendSuccessResponse(res, data);
  };
}
