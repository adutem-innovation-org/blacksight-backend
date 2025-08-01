import { sendSuccessResponse, throwUnprocessableEntityError } from "@/helpers";
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

    const data = await this.agentService.connect(
      req.authData!,
      agentId,
      sessionId
    );
    return sendSuccessResponse(res, data);
  };
}
