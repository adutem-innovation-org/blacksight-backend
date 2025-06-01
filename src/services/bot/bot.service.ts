import {
  AppointmentParam,
  BotStatus,
  ConversationMode,
  Events,
  Intent,
  RoleEnum,
} from "@/enums";
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
  logJsonError,
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
import { CacheService, eventEmitter, PaginationService } from "@/utils";
import { Model, Types } from "mongoose";
import { KnowledgeBaseService } from "../knowledge-base";
import { ConversationService } from "./conversation.service";
import OpenAI from "openai";
import { config } from "@/config";
import { intentActionsMapper } from "@/constants";
import EventEmitter2 from "eventemitter2";
import { Logger } from "winston";
import { logger } from "@/logging";

export class BotService {
  private static instance: BotService;

  // Helpers
  private readonly eventEmitter: EventEmitter2 = eventEmitter;
  private static readonly logJsonError = logJsonError;
  private readonly logger: Logger = logger;

  // Models
  private readonly botModel: Model<IBot> = Bot;
  private readonly knowledgeBaseModel: Model<IKnowledgeBase> = KnowledgeBase;
  private readonly meetingProviderModel: Model<IMeetingProvider> =
    MeetingProvider;
  private readonly conversationModel: Model<IConversation> = Conversation;

  // Services
  private readonly botPaginationService: PaginationService<IBot>;
  private readonly knowledgeBaseService: KnowledgeBaseService;
  private readonly conversationService: ConversationService;
  private readonly cacheService: CacheService;

  constructor() {
    this.botPaginationService = new PaginationService(this.botModel);
    this.knowledgeBaseService = KnowledgeBaseService.getInstace();
    this.conversationService = ConversationService.getInstance();
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
      { new: true, runValidators: true }
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
    const bot = await this.setBotStatus(authData, id, false);
    return { bot, message: "Bot deactivated" };
  }

  /**
   * The service method is used to re-activate a bot
   * @param authData The current authenticated entity
   * @param id The mongodb identifier of the bot to be re-activated
   * @returns Promise<{bot: IBot, message: string}>
   */
  async activateBot(authData: AuthData, id: string) {
    const bot = await this.setBotStatus(authData, id, true);
    return { bot, message: "Bot deactivated" };
  }

  async setBotStatus(auth: AuthData, id: string, status: boolean) {
    const bot = await this.botModel.findById(id);
    if (!bot) return throwNotFoundError("Bot not found");
    if (!isOwnerUser(auth, bot.businessId) && !isSuperAdmin(auth)) {
      return throwForbiddenError("You are not allowed to access this resource");
    }

    if (status) {
      await this.runKBValidation(
        bot.knowledgeBaseId.toString(),
        "Cannot activate this bot, because its associated knowledge base has been deleted",
        "Cannot activate this bot, because its associated knowledge base is inactive."
      );
    }

    bot.status = status ? BotStatus.ACTIVE : BotStatus.INACTIVE;
    bot.isActive = status;
    await bot.save();

    return bot;
  }

  /**
   * Validates in the current knowledge base exists and is active
   * @param botId
   */
  async runKBValidation(
    kbId: string,
    notFoundErrorMsg?: string,
    inActiveErrorMsg?: string
  ) {
    const kb = await this.knowledgeBaseModel.findById(kbId);
    if (!kb)
      return throwNotFoundError(
        notFoundErrorMsg ?? "The knowledgebase does not exist"
      );

    if (!kb.isActive)
      return throwUnprocessableEntityError(
        inActiveErrorMsg ?? "The knowledgebase is inactive"
      );
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

  // async askChatbot(authData: AuthData, body: AskChatbotDto) {
  //   const { userQuery, botId, conversationId } = body;

  //   const businessId = authData.userId.toString();
  //   let bot: IBot | null = await this.cacheService.get(botId);
  //   if (!bot) {
  //     bot = await this.botModel.findOne({ _id: new Types.ObjectId(botId) });
  //   }

  //   if (!bot)
  //     return throwUnprocessableEntityError("Unconfigured bot referenced");

  //   // ✅ Step 1: Construct the context for the AI to work with
  //   // The context for now will be a combination of the conversation summary + other message + userQuery + bot instructions
  //   // Get current conversation
  //   let conversation = await this.conversationService.getOrCreateConversation(
  //     conversationId,
  //     botId,
  //     businessId
  //   );

  //   // Save new message to it
  //   conversation = await this.conversationService.saveUserMessage(
  //     conversation,
  //     userQuery
  //   );

  //   // Process the conversation (generate summary if needed)
  //   let context = await this.conversationService.processConversation(
  //     conversation
  //   );

  //   // Extract relevant knowledge base
  //   let extractedKB = "";
  //   try {
  //     const documentId = bot.knowledgeBase.documentId.toString();
  //     console.log("Document Id", documentId);
  //     extractedKB = await this.knowledgeBaseService.queryKnowledgeBase(
  //       businessId,
  //       documentId,
  //       userQuery
  //     );
  //   } catch (error) {
  //     this.logger.error("Unable to extract knowledge base");
  //     BotService.logJsonError(error);
  //   }

  //   // Get bot custom instructions
  //   const customInstruction =
  //     bot.instructions ?? "No custom instruction from the business.";

  //   // ✅ Step 2: Detect message intent
  //   const intent = await this.conversationService.detectUserIntent({
  //     ...context,
  //     customInstruction,
  //     extractedKB,
  //     userQuery,
  //   });

  //   // ✅ Step 3: Handle intents
  //   switch (intent.intent) {
  //     case Intent.BOOK_APPOINTMENT:
  //       this.eventEmitter.emit(Events.INIT_APPOINTMENT, {
  //         businessId,
  //         conversationId,
  //       });
  //       break;
  //     case Intent.SET_APPOINTMENT_DATE:
  //       this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
  //         param: AppointmentParam.DATE,
  //         value: intent.parameters?.date,
  //         businessId,
  //         conversationId,
  //       });
  //       break;
  //     case Intent.SET_APPOINTMENT_EMAIL:
  //       this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
  //         param: AppointmentParam.EMAIL,
  //         value: intent.parameters?.email,
  //         businessId,
  //         conversationId,
  //       });
  //       break;
  //     case Intent.SET_APPOINTMENT_TIME:
  //       this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
  //         param: AppointmentParam.TIME,
  //         value: intent.parameters?.time,
  //         businessId,
  //         conversationId,
  //       });
  //     default:
  //       break;
  //   }

  //   // let knowledgeText = "";
  //   // const customInstructions =
  //   //   bot.instructions ?? "No custom instruction from the business.";
  //   // const documentId = bot.knowledgeBase.documentId.toString();

  //   // if (intent.intent === Intent.UNKNOWN) {
  //   //   if (documentId) {
  //   //     // Retrieve the most relevant knowledge base chunks
  //   //     try {
  //   //       knowledgeText = await this.knowledgeBaseService.queryKnowledgeBase(
  //   //         businessId,
  //   //         documentId,
  //   //         userQuery
  //   //       );
  //   //     } catch (error) {}
  //   //   }
  //   // }

  //   // Structured prompt
  //   // const developerPrompt = `
  //   // You are a chatbot for a business.
  //   // ${customInstructions}
  //   // Use the following information to answer user queries:
  //   // ${knowledgeText}

  //   // Past conversation summary:
  //   // ${context.summaries.join("\n")}

  //   // Last action you carried out:
  //   // ${intentActionsMapper[intent.intent]}
  //   // `;

  //   // Call OpenAI
  //   // const openaiResponse = await this.openai.chat.completions.create({
  //   //   model: "gpt-4",
  //   //   messages: [
  //   //     { role: "developer", content: developerPrompt },
  //   //     ...context.unsummarizedMessages,
  //   //   ],
  //   // });

  //   // const botResponse = {
  //   //   role: RoleEnum.ASSISTANT,
  //   //   content:
  //   //     openaiResponse.choices[0].message.content ??
  //   //     "I'm not sure I understood that. Could you please clarify",
  //   // };
  //   const botResponse = {
  //     role: RoleEnum.ASSISTANT,
  //     content: intent.message,
  //   };

  //   conversation.messages.push(botResponse);

  //   await conversation.save();

  //   return { data: botResponse };
  // }

  async askChatbot(authData: AuthData, body: AskChatbotDto) {
    const { userQuery, botId, conversationId } = body;
    const businessId = authData.userId.toString();

    // Get bot configuration
    let bot: IBot | null = await this.cacheService.get(botId);
    if (!bot) {
      bot = await this.botModel.findOne({ _id: new Types.ObjectId(botId) });
    }
    if (!bot) {
      return throwUnprocessableEntityError("Unconfigured bot referenced");
    }

    // Get or create conversation
    let conversation = await this.conversationService.getOrCreateConversation(
      conversationId,
      botId,
      businessId
    );

    // Process conversation with optimized context
    const context = await this.conversationService.processConversationOptimized(
      conversation
    );

    // Save user message
    // ✅ This approach was reversed because we don't want to summarize the message the user just sent... Rather we want to summarize only past conversation if they are up to the required threshold
    conversation = await this.conversationService.saveUserMessage(
      conversation,
      userQuery
    );

    // Extract knowledge base in parallel
    const kbPromise = this.extractKnowledgeBase(bot, businessId, userQuery);
    const extractedKB = await kbPromise;

    // Get custom instructions
    const customInstruction =
      bot.instructions ?? "No custom instruction from the business.";

    // Detect intent with function calling
    const intentResult =
      await this.conversationService.detectUserIntentWithFunctions({
        ...context,
        customInstruction,
        extractedKB,
        userQuery,
      });

    // Handle function calls if present
    if (intentResult.functionCalls && intentResult.functionCalls.length > 0) {
      console.log("Function call detected");
      console.log(intentResult.functionCalls);
      await this.handleFunctionCalls(
        intentResult.functionCalls,
        businessId,
        conversationId
      );
    }

    // Handle cases where the function call is not called but that the intent is detected
    if (
      (!intentResult.functionCalls ||
        intentResult?.functionCalls.length === 0) &&
      intentResult.intent !== Intent.GENERAL_INQUIRY
    ) {
      switch (intentResult.intent) {
        case Intent.BOOK_APPOINTMENT:
          this.eventEmitter.emit(Events.INIT_APPOINTMENT, {
            businessId,
            conversationId,
          });
          break;
        case Intent.SET_APPOINTMENT_DATE:
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.DATE,
            value: intentResult.parameters?.date,
            businessId,
            conversationId,
          });
          break;
        case Intent.SET_APPOINTMENT_EMAIL:
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.EMAIL,
            value: intentResult.parameters?.email,
            businessId,
            conversationId,
          });
          break;
        case Intent.SET_APPOINTMENT_TIME:
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.TIME,
            value: intentResult.parameters?.time,
            businessId,
            conversationId,
          });
        default:
          break;
      }
    }

    // Generate contextual response
    const botResponse =
      await this.conversationService.generateContextualResponse({
        context,
        extractedKB,
        customInstruction,
        intentResult,
        userQuery,
      });

    // Save bot response
    conversation.messages.push(botResponse);
    await conversation.save();

    return { data: botResponse };
  }

  private async extractKnowledgeBase(
    bot: IBot,
    businessId: string,
    userQuery: string
  ): Promise<string> {
    try {
      const documentId = bot.knowledgeBase.documentId.toString();
      return await this.knowledgeBaseService.queryKnowledgeBase(
        businessId,
        documentId,
        userQuery
      );
    } catch (error) {
      this.logger.error("Unable to extract knowledge base");
      BotService.logJsonError(error);
      return "";
    }
  }

  private async handleFunctionCalls(
    functionCalls: any[],
    businessId: string,
    conversationId: string
  ) {
    for (const functionCall of functionCalls) {
      const { name, arguments: args } = functionCall;

      switch (name) {
        case "initiate_appointment_booking":
          this.eventEmitter.emit(Events.INIT_APPOINTMENT, {
            businessId,
            conversationId,
          });
          break;

        case "collect_appointment_email":
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.EMAIL,
            value: JSON.parse(args).email,
            businessId,
            conversationId,
          });
          break;

        case "set_appointment_date":
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.DATE,
            value: JSON.parse(args).date,
            businessId,
            conversationId,
          });
          break;

        case "set_appointment_time":
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.TIME,
            value: JSON.parse(args).time,
            businessId,
            conversationId,
          });
          break;
      }
    }
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
    const conversation = await this.conversationModel.findOneAndUpdate(
      {
        botId: new Types.ObjectId(botId),
        conversationId,
        mode: ConversationMode.TRAINING,
        businessId: new Types.ObjectId(auth.userId),
      },
      {
        messages: [],
        summaries: [],
      },
      { new: true }
    );
    if (!conversation) return throwNotFoundError("Conversation not found");
    return { message: "Training conversation deleted", conversation };
  }
}
