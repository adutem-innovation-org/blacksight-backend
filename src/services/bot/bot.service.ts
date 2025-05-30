import { BotStatus, ConversationMode, Intent, RoleEnum } from "@/enums";
import {
  AskChatbotDto,
  ConfigureBotDto,
  UpdateBotConfigurationDto,
  UpdateBotInstructionsDto,
} from "@/decorators";
import {
  isOwner,
  isOwnerUser,
  isSuperAdmin,
  isUser,
  throwForbiddenError,
  throwNotFoundError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { AuthData } from "@/interfaces";
import {
  Bot,
  Conversation,
  IBot,
  IConversation,
  IKnowledgeBase,
  IMeetingProvider,
  KnowledgeBase,
  MeetingProvider,
} from "@/models";
import { CacheService, PaginationService } from "@/utils";
import { Model, Types } from "mongoose";
import { KnowledgeBaseService } from "../knowledge-base";
import { ConversationService } from "./conversation.service";
import OpenAI from "openai";
import { config } from "@/config";
import { intentActionsMapper } from "@/constants";

export class BotService {
  private static instance: BotService;
  private readonly botModel: Model<IBot> = Bot;
  private readonly openai: OpenAI;

  private readonly knowledgeBaseModel: Model<IKnowledgeBase> = KnowledgeBase;
  private readonly meetingProviderModel: Model<IMeetingProvider> =
    MeetingProvider;
  private readonly conversationModel: Model<IConversation> = Conversation;

  private readonly botPaginationService: PaginationService<IBot>;
  private readonly knowledgeBaseService: KnowledgeBaseService;
  private readonly conversationService: ConversationService;
  private readonly cacheService: CacheService;

  constructor() {
    this.botPaginationService = new PaginationService(this.botModel);
    this.knowledgeBaseService = KnowledgeBaseService.getInstace();
    this.conversationService = ConversationService.getInstance();
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.cacheService = CacheService.getInstance();
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
   * The service method is used to deactivate a bot
   * @param authData The current authenticated entity
   * @param id The mongodb identifier of the bot to be deactivated
   * @returns Promise<{bot: IBot, message: string}>
   */
  async deactivateBot(authData: AuthData, id: string) {
    const bot = await this.botModel.findById(id);
    if (!bot) return throwNotFoundError("Bot not found");
    if (!isOwnerUser(authData, bot.businessId) && !isSuperAdmin(authData)) {
      return throwForbiddenError(
        "You are not allowed to access this resource."
      );
    }

    bot.status = BotStatus.INACTIVE;
    bot.isActive = false;

    await bot.save();

    return { bot, message: "Bot deactivated" };
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

  async startConversation(authData: AuthData, botId: string) {
    let bot: IBot | null = await this.cacheService.get(botId);
    if (!bot) {
      bot = await this.botModel.findById(botId);
    }

    if (!bot)
      return throwUnprocessableEntityError("Unconfigured bot referenced");

    const conversation = await this.conversationService.startNewConversation(
      botId,
      authData.userId
    );

    const newMessage = {
      role: RoleEnum.ASSISTANT,
      content: bot.welcomeMessage,
    };

    conversation.messages.push(newMessage);

    await conversation.save();

    return { data: newMessage, conversationId: conversation.conversationId };
  }

  async askChatbot(authData: AuthData, body: AskChatbotDto) {
    const { userQuery, botId, conversationId } = body;

    const businessId = authData.userId.toString();
    let bot: IBot | null = await this.cacheService.get(botId);
    if (!bot) {
      bot = await this.botModel.findOne({ _id: new Types.ObjectId(botId) });
    }

    if (!bot)
      return throwUnprocessableEntityError("Unconfigured bot referenced");

    // ✅ Step 1: Construct the context for the AI to work with
    // The context for now will be a combination of the conversation summary + other message + userQuery + bot instructions
    // Get current conversation
    let conversation = await this.conversationService.getOrCreateConversation(
      conversationId,
      botId,
      businessId
    );

    // Save new message to it
    conversation = await this.conversationService.saveUserMessage(
      conversation,
      userQuery
    );

    // Process the conversation (generate summary if needed)
    let context = await this.conversationService.processConversation(
      conversation
    );

    // ✅ Step 2: Detect message intent
    const intent = await this.conversationService.detectUserIntent({
      ...context,
      userQuery,
    });

    // ✅ Step 3: Handle intents
    switch (intent.intent) {
      case Intent.BOOK_APPOINTMENT:
        console.log("Book appointment initialized >> ", intent);
        break;
      case Intent.SET_APPOINTMENT_DATE:
        console.log("Appointment date set >> ", intent);
        break;
      case Intent.SET_APPOINTMENT_EMAIL:
        console.log("Appointment email set >> ", intent);
        break;
      case Intent.SET_APPOINTMENT_TIME:
        console.log("Appointment time set >> ", intent);
      default:
        break;
    }

    // let knowledgeText = "";
    // const customInstructions =
    //   bot.instructions ?? "No custom instruction from the business.";
    // const documentId = bot.knowledgeBase.documentId.toString();

    // if (intent.intent === Intent.UNKNOWN) {
    //   if (documentId) {
    //     // Retrieve the most relevant knowledge base chunks
    //     try {
    //       knowledgeText = await this.knowledgeBaseService.queryKnowledgeBase(
    //         businessId,
    //         documentId,
    //         userQuery
    //       );
    //     } catch (error) {}
    //   }
    // }

    // Structured prompt
    // const developerPrompt = `
    // You are a chatbot for a business.
    // ${customInstructions}
    // Use the following information to answer user queries:
    // ${knowledgeText}

    // Past conversation summary:
    // ${context.summaries.join("\n")}

    // Last action you carried out:
    // ${intentActionsMapper[intent.intent]}
    // `;

    // Call OpenAI
    // const openaiResponse = await this.openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     { role: "developer", content: developerPrompt },
    //     ...context.unsummarizedMessages,
    //   ],
    // });

    // const botResponse = {
    //   role: RoleEnum.ASSISTANT,
    //   content:
    //     openaiResponse.choices[0].message.content ??
    //     "I'm not sure I understood that. Could you please clarify",
    // };
    const botResponse = {
      role: RoleEnum.ASSISTANT,
      content: intent.message,
    };

    conversation.messages.push(botResponse);

    await conversation.save();

    return { data: botResponse };
  }

  async getTrainingConversation(auth: AuthData, botId: string) {
    const trainingConversation = await this.conversationModel.findOne({
      mode: ConversationMode.TRAINING,
      botId: new Types.ObjectId(botId),
      businessId: new Types.ObjectId(auth.userId),
    });

    if (!trainingConversation) {
      return throwNotFoundError("Conversation not found");
    }

    return {
      messages: trainingConversation.messages,
      conversationId: trainingConversation.conversationId,
      botId: trainingConversation.botId,
    };
  }

  async clearTrainingConversation(
    auth: AuthData,
    botId: string,
    conversationId: string
  ) {
    const conversation = await this.conversationModel.findOneAndDelete({
      botid: new Types.ObjectId(botId),
      conversationId: new Types.ObjectId(conversationId),
      mode: ConversationMode.TRAINING,
      businessId: new Types.ObjectId(auth.userId),
    });
    return { message: "Training conversation deleted", conversation };
  }
}
