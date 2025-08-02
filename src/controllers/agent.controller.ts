import { AskAgentDto, BookingRequestDto, SubmitTicketDto } from "@/decorators";
import { sendSuccessResponse, throwUnprocessableEntityError } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { AgentService } from "@/services";
import { Request, Response } from "express";
import { Types } from "mongoose";

export class AgentController {
  private static instance: AgentController;

  private readonly agentService: AgentService;
  constructor() {
    this.agentService = AgentService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new AgentController();
    }
    return this.instance;
  }

  connect = async (req: Request, res: Response) => {
    const { agentId, sessionId } = this._getAgentAndSessionID(req);

    const data = await this.agentService.connect(
      req.authData!,
      agentId,
      sessionId
    );
    return sendSuccessResponse(res, data);
  };

  ask = async (req: GenericReq<AskAgentDto>, res: Response) => {
    const { agentId, sessionId } = this._getAgentAndSessionID(req);

    const data = await this.agentService.ask(
      req.authData!,
      agentId,
      sessionId,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  transcribeSpeech = async (req: Request, res: Response) => {
    const { agentId } = this._getAgentAndSessionID(req);

    if (!req.file)
      return throwUnprocessableEntityError("Unable to transcribe audio.");

    const data = await this.agentService.speechToText(
      req.authData!,
      req.file,
      agentId
    );
    return sendSuccessResponse(res, data);
  };

  bookAppointment = async (
    req: GenericReq<BookingRequestDto>,
    res: Response
  ) => {
    const { agentId, sessionId } = this._getAgentAndSessionID(req);

    const data = await this.agentService.bookAppointment(
      req.authData!,
      agentId,
      sessionId,
      req.body
    );

    return sendSuccessResponse(res, data);
  };

  submitTicket = async (req: GenericReq<SubmitTicketDto>, res: Response) => {
    const { agentId, sessionId } = this._getAgentAndSessionID(req);

    const data = await this.agentService.submitTicket(
      req.authData!,
      agentId,
      sessionId,
      req.body
    );

    return sendSuccessResponse(res, data);
  };

  private _getAgentAndSessionID = (req: Request) => {
    const agentId = req.headers["x-agent-id"] as string;
    const sessionId = req.sessionId;

    if (!agentId)
      return throwUnprocessableEntityError(
        "Unable to connect. Missing agent ID."
      );

    if (!Types.ObjectId.isValid(agentId))
      return throwUnprocessableEntityError(
        "Unable to connect. Invalid agent ID."
      );

    if (!sessionId)
      return throwUnprocessableEntityError(
        "Unable to connect. Missing session ID."
      );

    return { agentId, sessionId };
  };
}
