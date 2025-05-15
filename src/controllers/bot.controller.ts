import { ConfigureBotDto } from "@/decorators";
import { sendSuccessResponse } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { BotService } from "@/services/bot";
import { Request, Response } from "express";

export class BotController {
  private static instance: BotController;
  private readonly botService: BotService;

  constructor() {
    this.botService = BotService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new BotController();
    }
    return this.instance;
  }

  botAnalytics = async (req: Request, res: Response) => {
    const data = await this.botService.analytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getBots = async (req: Request, res: Response) => {
    const data = await this.botService.getAllBots(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getBotById = async (req: Request, res: Response) => {
    const data = await this.botService.getBotById(req.authData!, req.params.id);
    return sendSuccessResponse(res, data);
  };

  configureBot = async (req: GenericReq<ConfigureBotDto>, res: Response) => {
    const data = await this.botService.configureBot(req.authData!, req.body);
    return sendSuccessResponse(res, data);
  };

  deleteBot = async (req: Request, res: Response) => {
    const data = await this.botService.deleteBot(req.authData!, req.params.id);
    return sendSuccessResponse(res, data);
  };
}
