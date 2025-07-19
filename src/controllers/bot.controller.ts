import {
  AskChatbotDto,
  ConfigureBotDto,
  StartConversationDto,
  TranscribeChatAudioDto,
  UpdateBotConfigurationDto,
  UpdateBotInstructionsDto,
} from "@/decorators";
import { sendSuccessResponse, throwUnprocessableEntityError } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { BotService, ConversationService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export class BotController {
  private static instance: BotController;
  private readonly botService: BotService;
  private readonly conversationService: ConversationService;

  constructor() {
    this.botService = BotService.getInstance();
    this.conversationService = ConversationService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new BotController();
    }
    return this.instance;
  }

  updateAllBots = async (req: Request, res: Response) => {
    const data = await this.botService.updateAllBots(req.body);
    return sendSuccessResponse(res, data);
  };

  botAnalytics = async (req: Request, res: Response) => {
    const data = await this.botService.analytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  conversationAnalytics = async (req: Request, res: Response) => {
    const data = await this.conversationService.analytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getBots = async (req: Request, res: Response) => {
    const data = await this.botService.getAllBots(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getAllConversations = async (req: Request, res: Response) => {
    const data = await this.conversationService.getAllConversations(
      req.authData!
    );
    return sendSuccessResponse(res, data);
  };

  getBotById = async (req: Request, res: Response) => {
    const data = await this.botService.getBotById(req.authData!, req.params.id);
    return sendSuccessResponse(res, data);
  };

  configureBot = async (req: GenericReq<ConfigureBotDto>, res: Response) => {
    const data = await this.botService.configureBot(req.authData!, req.body);
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  updateBotConfiguration = async (
    req: GenericReq<UpdateBotConfigurationDto>,
    res: Response
  ) => {
    const data = await this.botService.updateBotConfigurations(
      req.authData!,
      req.params.id,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  updateBotInstructions = async (
    req: GenericReq<UpdateBotInstructionsDto>,
    res: Response
  ) => {
    const data = await this.botService.updateBotInstructions(
      req.authData!,
      req.params.id,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  deactivateBot = async (req: Request, res: Response) => {
    const data = await this.botService.deactivateBot(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  activateBot = async (req: Request, res: Response) => {
    const data = await this.botService.activateBot(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  deleteBot = async (req: Request, res: Response) => {
    const data = await this.botService.deleteBot(req.authData!, req.params.id);
    return sendSuccessResponse(res, data);
  };

  askChatbot = async (req: GenericReq<AskChatbotDto>, res: Response) => {
    const data = await this.botService.chatInPlayground(
      req.authData!,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  startConversation = async (
    req: GenericReq<StartConversationDto>,
    res: Response
  ) => {
    const data = await this.botService.startConversation(
      req.authData!,
      req.body.botId
    );
    return sendSuccessResponse(res, data);
  };

  getTrainingConversation = async (req: Request, res: Response) => {
    const data = await this.botService.getTrainingConversation(
      req.authData!,
      req.params.botId
    );
    return sendSuccessResponse(res, data);
  };

  clearTrainingConversation = async (req: Request, res: Response) => {
    const data = await this.botService.clearTrainingConversation(
      req.authData!,
      req.params.botId,
      req.params.conversationId
    );
    return sendSuccessResponse(res, data);
  };

  speechToText = async (
    req: GenericReq<TranscribeChatAudioDto>,
    res: Response
  ) => {
    if (!req.file)
      return throwUnprocessableEntityError("Unable to transcribe audio.");
    const data = await this.botService.speechToText(
      req.authData!,
      req.file,
      req.body
    );
    return sendSuccessResponse(res, data);
  };
}
