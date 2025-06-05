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
  TranscribeChatAudioDto,
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
import {
  AudioConverter,
  CacheService,
  eventEmitter,
  PaginationService,
} from "@/utils";
import { Model, Types } from "mongoose";
import { KnowledgeBaseService } from "../knowledge-base";
import { ConversationService } from "./conversation.service";
import OpenAI from "openai";
import { config } from "@/config";
import { intentActionsMapper } from "@/constants";
import EventEmitter2 from "eventemitter2";
import { Logger } from "winston";
import { logger } from "@/logging";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { AppointmentService } from "../appointment";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { encoding_for_model } from "@dqbd/tiktoken";
const enc = encoding_for_model("gpt-4"); //

export class BotService {
  private static instance: BotService;

  // Helpers
  private readonly eventEmitter: EventEmitter2 = eventEmitter;
  private static readonly logJsonError = logJsonError;
  private static readonly logger: Logger = logger;

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
  private readonly appointmentService: AppointmentService;
  private readonly cacheService: CacheService;
  private readonly openai: OpenAI;

  constructor() {
    this.botPaginationService = new PaginationService(this.botModel);
    this.knowledgeBaseService = KnowledgeBaseService.getInstace();
    this.conversationService = ConversationService.getInstance();
    this.appointmentService = AppointmentService.getInstance();
    this.cacheService = CacheService.getInstance();
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
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

    // Get the appointment data
    const result = await this.appointmentService.getConversationAppointment(
      conversationId
    );
    const currentAppointmentData =
      result?.isRecent && result.appointment
        ? `Current appointment data collected: ${JSON.stringify(
            result.appointment
          )}`
        : "Current appointment data collected: None";

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
        currentAppointmentData,
      });

    console.log(intentResult);

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
            botId,
            providerId: bot?.meetingProviderId,
            values: intentResult.parameters || {},
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
        case Intent.SET_APPOINTMENT_DATE:
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.DATE,
            value: intentResult.parameters?.date,
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
          break;
        case Intent.SET_APPOINTMENT_DATE_AND_TIME:
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.DATE_TIME,
            values: intentResult.parameters,
            businessId,
            conversationId,
          });
          break;
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
      BotService.logger.error("Unable to extract knowledge base");
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

        case "set_appointment_date_and_time":
          this.eventEmitter.emit(Events.SET_APPOINTMENT_PARAM, {
            param: AppointmentParam.DATE_TIME,
            value: JSON.parse(args),
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

  async speechToText(
    authData: AuthData,
    audioFile: Express.Multer.File,
    body: TranscribeChatAudioDto
  ) {
    const { botId } = body;

    // Get bot configuration
    let bot: IBot | null = await this.cacheService.get(botId);
    if (!bot) {
      bot = await this.botModel.findOne({
        _id: new Types.ObjectId(botId),
        businessId: new Types.ObjectId(authData.userId),
      });
    }
    if (!bot) {
      return throwUnprocessableEntityError("Unconfigured bot referenced");
    }

    const filePath = audioFile.path;
    const convertedPath = path.join(
      path.dirname(filePath),
      `${path.parse(filePath).name}.mp3`
    );

    try {
      // Convert the file from .webm to .mp3
      try {
        await AudioConverter.convertToMp3(filePath, convertedPath);
        BotService.logger.info("Speech file successfully converted");
      } catch (error) {
        BotService.logger.error("Unable to convert speech file");
        BotService.logJsonError(error);
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(convertedPath),
        model: "whisper-1",
      });

      return { text: transcription.text };
    } catch (error) {
      BotService.logJsonError(error);
      return throwUnprocessableEntityError("Unable to transcribe audio");
    } finally {
      try {
        await fs.promises.unlink(audioFile.path);
      } catch (err: any) {
        console.warn("File deletion failed or already removed:", err.message);
      }

      try {
        await fs.promises.unlink(convertedPath);
      } catch (err: any) {
        console.warn("Converted file deletion failed:", err.message);
      }
    }
  }

  async responseTimeAnalytics(auth: AuthData) {
    const today = startOfDay(new Date());
    const startDate = subDays(today, 6);
    const endDate = endOfDay(new Date());

    const bots = await this.botModel.find({ businessId: auth.userId });

    const botIds = bots.map((b) => b._id);
    const botMap = Object.fromEntries(
      bots.map((b) => [b._id.toString(), b.name])
    );

    const conversations = await this.conversationModel
      .find({
        botId: { $in: botIds },
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .lean();

    // Initialize structure for each bot, with arrays for each of 7 days
    const stats: Record<string, number[]> = {};
    const counts: Record<string, number[]> = {};

    for (const bot of bots) {
      stats[bot.name] = Array(7).fill(0);
      counts[bot.name] = Array(7).fill(0);
    }

    for (const convo of conversations) {
      const { messages, botId } = convo;
      if (!messages || messages.length < 2) continue;

      let i = messages[0].role === "user" ? 0 : 1;

      while (i < messages.length - 1) {
        const userMsg = messages[i];
        const botMsg = messages[i + 1];

        if (
          userMsg.role === "user" &&
          botMsg.role === "assistant" &&
          userMsg.createdAt &&
          botMsg.createdAt
        ) {
          const responseTimeSec =
            (botMsg.createdAt.getTime() - userMsg.createdAt.getTime()) / 1000;

          const dayIndex =
            6 -
            Math.floor(
              (today.getTime() - startOfDay(userMsg.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            );

          if (dayIndex >= 0 && dayIndex <= 6) {
            const botName = botMap[botId.toString()];
            stats[botName][dayIndex] += responseTimeSec;
            counts[botName][dayIndex] += 1;
          }

          i += 2; // skip to next user-bot pair
        } else {
          i += 1; // skip if no valid pair
        }
      }
    }

    const result = Object.entries(stats).map(([botName, values]) => {
      const averaged = values.map((sum, i) =>
        counts[botName][i] ? +(sum / counts[botName][i]).toFixed(2) : 0
      );
      return { name: botName, data: averaged };
    });

    const categories = Array.from({ length: 7 }).map((_, i) =>
      format(subDays(today, 6 - i), "yyyy-MM-dd")
    );

    return { series: result, categories };
  }

  async extractTokenUsageStats(businessId: string) {
    // Get all bots for the user
    const bots = await Bot.find({ businessId: new Types.ObjectId(businessId) });

    const result: Record<
      string,
      { botName: string; categories: string[]; series: number[] }
    > = {};

    for (const bot of bots) {
      const conversations = await Conversation.find({ botId: bot._id });

      let queryTokens = 0;
      let responseTokens = 0;

      for (const convo of conversations) {
        for (const message of convo.messages) {
          const tokenCount = enc.encode(message.content).length;
          if (message.role === RoleEnum.USER) {
            queryTokens += tokenCount;
          } else if (message.role === RoleEnum.ASSISTANT) {
            responseTokens += tokenCount;
          }
        }
      }

      const total = queryTokens + responseTokens || 1; // avoid division by 0

      result[bot._id.toString()] = {
        botName: bot.name,
        categories: ["Query", "Response"],
        series: [
          Number(((queryTokens / total) * 100).toFixed(2)),
          Number(((responseTokens / total) * 100).toFixed(2)),
        ],
      };
    }

    return Object.values(result);
  }
}
