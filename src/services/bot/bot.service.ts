import {
  ConfigureBotDto,
  UpdateBotConfigurationDto,
  UpdateBotInstructionsDto,
} from "@/decorators";
import {
  isOwner,
  isUser,
  throwForbiddenError,
  throwNotFoundError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { AuthData } from "@/interfaces";
import {
  Bot,
  IBot,
  IKnowledgeBase,
  IMeetingProvider,
  KnowledgeBase,
  MeetingProvider,
} from "@/models";
import { PaginationService } from "@/utils";
import { Model, Types } from "mongoose";

export class BotService {
  private static instance: BotService;
  private readonly botModel: Model<IBot> = Bot;
  private readonly knowledgeBaseModel: Model<IKnowledgeBase> = KnowledgeBase;
  private readonly meetingProviderModel: Model<IMeetingProvider> =
    MeetingProvider;
  private readonly botPaginationService: PaginationService<IBot>;

  constructor() {
    this.botPaginationService = new PaginationService(this.botModel);
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new BotService();
    }
    return this.instance;
  }

  async updateAllBots(data: any) {
    const result = await this.botModel.updateMany({}, data);
    return { result };
  }

  async analytics(auth: AuthData) {
    let query: Record<string, any> = {};
    if (isUser(auth)) {
      query = { businessId: new Types.ObjectId(auth.userId) };
    }
    const result = await Promise.allSettled([
      this.botModel.countDocuments(query).exec(),
      this.botModel.countDocuments({ isActive: true, ...query }),
    ]);

    return {
      data: {
        totalBots: result[0].status === "fulfilled" ? result[0].value : 0,
        activeBots: result[1].status === "fulfilled" ? result[1].value : 0,
      },
    };
  }

  async getAllBots(auth: AuthData) {
    let query: Record<string, any> = {};
    if (isUser(auth)) {
      query.businessId = new Types.ObjectId(auth.userId);
    }
    return await this.botPaginationService.paginate({ query }, []);
  }

  async getBotById(auth: AuthData, id: string) {
    const bot = await this.botModel.findById(id);
    if (!bot) return throwNotFoundError("Bot not found");
    if (isUser(auth) && !isOwner(auth, bot.businessId)) {
      return throwForbiddenError(
        "You are not allowed to access this resource."
      );
    }
    return { bot, message: "Bot fetched successfully" };
  }

  /**
   * This service method is used to setup a new bot
   * @param auth The current authenticated user
   * @param body The required data schema for configuring a new both
   * @returns Promise<{bot: IBot, message: string}>
   */
  async configureBot(auth: AuthData, body: ConfigureBotDto) {
    await this.validateBotConfiguration(body);

    const bot = await this.botModel.create({
      businessId: auth.userId,
      ...body,
    });

    await bot.populate("knowledgeBase");

    return { bot, message: "Bot created successfully" };
  }

  /**
   * The service method is used to update a bot's configuration
   * @param auth The current authenticated user
   * @param id The mongodb identifier of the bot to be updated
   * @param body The update data
   * @returns Promise<{bot: IBot, message: string}>
   */
  async updateBotConfigurations(
    auth: AuthData,
    id: string,
    body: UpdateBotInstructionsDto
  ) {
    await this.validateBotConfiguration(body);

    return await this.setBotConfigs(auth, id, body);
  }

  /**
   * The service method is used to update a bot's instructions
   * @param auth The current authenticated user
   * @param id The mongodb identifier of the bot to be updated
   * @param body The new instructions
   * @returns Promise<{bot: IBot, message: string}>
   */
  async updateBotInstructions(
    auth: AuthData,
    id: string,
    body: UpdateBotInstructionsDto
  ) {
    return this.setBotConfigs(auth, id, body);
  }

  private async setBotConfigs(auth: AuthData, id: string, body: any) {
    const bot = await this.botModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        businessId: new Types.ObjectId(auth.userId),
      },
      body,
      { new: true }
    );

    if (!bot) return throwNotFoundError("Bot not found");

    return { bot, message: "Bot updated" };
  }

  /**
   * The service method is used to validate the knowledgebase and the meetingProvider selected for a bot
   * @param body The configurations for the bot
   * @returns Promise<boolean>
   */
  async validateBotConfiguration(
    body: ConfigureBotDto | UpdateBotConfigurationDto
  ) {
    if (body.knowledgeBaseId) {
      const knowledgeBaseExist = await this.knowledgeBaseModel.exists({
        _id: new Types.ObjectId(body.knowledgeBaseId),
      });
      if (!knowledgeBaseExist)
        return throwUnprocessableEntityError(
          "The knowledge base you selected does not exist."
        );
    }

    // validate if meeting provider exist, when schedule meeting is true and meetingProviderId is provided
    if (body.scheduleMeeting && body.meetingProviderId) {
      const meetingProviderExist = await this.meetingProviderModel.exists({
        _id: new Types.ObjectId(body.meetingProviderId),
      });
      if (!meetingProviderExist)
        return throwUnprocessableEntityError(
          "The meeting provider selected does not exist"
        );
    }

    return true;
  }

  /**
   * This service method is used to remove a configured bot from the database
   * @param authData The current authenticated user
   * @param id The mongodb identifier of the bot to be deleted
   * @returns Promise<{bot: IBot, message: string}>
   */
  async deleteBot(authData: AuthData, id: string) {
    const bot = await this.botModel.findOneAndDelete({
      businessId: new Types.ObjectId(authData.userId),
      _id: new Types.ObjectId(id),
    });
    if (!bot) return throwNotFoundError("Bot not found");
    return { bot, message: "Bot deleted successfully" };
  }
}
