import { config } from "@/config";
import { intentActionsMapper } from "@/constants";
import { Intent, RoleEnum, UserTypes } from "@/enums";
import { appointmentFunctions } from "@/functions";
import { logJsonError } from "@/helpers";
import { AuthData } from "@/interfaces";
import { logger } from "@/logging";
import {
  Appointment,
  Conversation,
  IAppointment,
  IConversation,
  IMessage,
} from "@/models";
import { intentDetectionSchema } from "@/schema";
import { CacheService, PaginationService } from "@/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import { Model, Types } from "mongoose";
import OpenAI from "openai";
import { v4 as uuid_v4 } from "uuid";
import { Logger } from "winston";

export class ConversationService {
  private static instance: ConversationService;
  private static logger: Logger = logger;
  private static logJsonError = logJsonError;

  // private readonly SUMMARY_TRIGGER_THRESHOLD = 10;
  private readonly SUMMARY_TRIGGER_THRESHOLD = 12;
  private readonly MAX_UNSUMMARIZED_MESSAGES = 15;

  // Models
  private readonly appointmentModel: Model<IAppointment> = Appointment;
  private readonly conversationModel: Model<IConversation> = Conversation;

  private readonly pinecone: Pinecone;
  private readonly openai: OpenAI;

  private readonly cacheService: CacheService;
  private readonly paginationService: PaginationService<IConversation>;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey,
      maxRetries: 5,
    });
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.cacheService = CacheService.getInstance();
    this.paginationService = new PaginationService(this.conversationModel);
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ConversationService();
    }
    return this.instance;
  }

  async analytics(auth: AuthData) {
    let query: Record<string, any> = {};
    if (auth.userType === UserTypes.USER) {
      query = { businessId: new Types.ObjectId(auth.userId) };
    }

    // Get distinct conversationIds from appointments
    const conversationIds = await this.appointmentModel.distinct(
      "conversationId",
      query
    );

    const result = await Promise.allSettled([
      this.conversationModel.countDocuments(query),
      this.conversationModel.countDocuments({
        conversationId: { $in: conversationIds },
        ...query,
      }),
    ]);

    return {
      data: {
        totalConversations:
          result[0].status === "fulfilled" ? result[0].value : 0,
        totalConversationsWithAppointment:
          result[1].status === "fulfilled" ? result[1].value : 0,
      },
    };
  }

  async getAllConversations(auth: AuthData) {
    let query: Record<string, any> = {};
    if (auth.userType === UserTypes.USER) {
      query.businessId = new Types.ObjectId(auth.userId);
    }
    return await this.paginationService.paginate(
      { query, populate: ["bot"], sort: { createdAt: -1 } },
      []
    );
  }

  async getOrCreateConversation(
    conversationId: string,
    botId: string,
    businessId: string
  ) {
    let conversation = (await this.cacheService.get(
      conversationId
    )) as IConversation;
    if (!conversation) {
      conversation = await this.conversationModel.findOneAndUpdate(
        { conversationId, botId, businessId },
        { conversationId, botId, businessId },
        { upsert: true, new: true }
      );
    }
    return conversation;
  }

  async startNewConversation(
    botId: string,
    businessId: string,
    conversationId?: string
  ) {
    const conversation = await this.conversationModel.create({
      conversationId: conversationId ?? uuid_v4(),
      botId,
      businessId,
    });
    return conversation;
  }

  async saveUserMessage(conversation: IConversation, userQuery: string) {
    // Create a new message
    const newMessage: IMessage = { role: RoleEnum.USER, content: userQuery };

    // Add the message to the conversation
    conversation.messages.push(newMessage);

    // Save the conversation
    await conversation.save();

    return conversation;
  }

  async saveBotResponse(
    conversationId: string,
    response: {
      role: RoleEnum;
      content: any;
    }
  ) {
    const conversation = await this.conversationModel.findOne({
      conversationId,
    });

    if (!conversation) return;

    // Add the response to the conversation
    conversation.messages.push(response);

    // Save the conversation
    await conversation.save();
  }

  async processConversation(conversation: IConversation) {
    const totalMessages = conversation.messages.length;
    const lastSummary =
      conversation.summaries[conversation.summaries.length - 1];
    const lastSummaryIndex = lastSummary?.endIndex ?? -1;
    const unsummarizedCount = totalMessages - (lastSummaryIndex + 1);

    // Only summarize if we exceed threshold
    if (unsummarizedCount >= this.SUMMARY_TRIGGER_THRESHOLD) {
      await this.createNewSummary(conversation, lastSummaryIndex);
    }

    // Optimize unsummarized messages - keep only recent ones for performance
    const startIndex = Math.max(
      (conversation.summaries.at(-1)?.endIndex ?? -1) + 1,
      totalMessages - this.MAX_UNSUMMARIZED_MESSAGES
    );

    return {
      summaries: conversation.summaries.map((s) => s.content),
      unsummarizedMessages: conversation.messages.slice(startIndex),
    };
  }

  private async createNewSummary(
    conversation: IConversation,
    lastSummaryIndex: number
  ) {
    const messagesToSummarize = conversation.messages.slice(
      lastSummaryIndex + 1,
      lastSummaryIndex + 1 + this.SUMMARY_TRIGGER_THRESHOLD
    );

    const summaryText = await this.summarizeMessages(messagesToSummarize);

    const newSummary = {
      content: summaryText,
      startIndex: lastSummaryIndex + 1,
      endIndex: lastSummaryIndex + this.SUMMARY_TRIGGER_THRESHOLD,
    };

    conversation.summaries.push(newSummary);
    await conversation.save();
  }

  async summarizeMessages(messages: IMessage[]) {
    const chatMessages = messages.map((msg) => ({
      role: msg.role, // assuming msg.role is "user" or "assistant"
      content: msg.content,
    }));

    chatMessages.unshift({
      role: RoleEnum.DEVELOPER,
      content:
        "Create a concise summary of this conversation between a user and business chatbot, focusing on key topics, requests, and any appointment-related discussions.",
    });

    const summaryResponse = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages,
      temperature: 0.2,
      max_completion_tokens: 150,
    });

    return summaryResponse.choices[0].message.content ?? "";
  }

  async detectUserIntentWithFunctions(messages: IMessage[]) {
    try {
      const openaiResponse = await this.openai.chat.completions.create({
        model: "gpt-4o", // Use latest model for better function calling
        messages,
        temperature: 0.1, // Lower temperature for more consistent responses
        functions: appointmentFunctions,
        function_call: "auto",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "intent_response",
            schema: intentDetectionSchema,
            strict: true,
          },
        },
      });

      const response = openaiResponse.choices[0];
      let intentResult: any = {};

      // Handle structured output
      if (response.message.content) {
        try {
          intentResult = JSON.parse(response.message.content);
        } catch (e) {
          // Fallback if JSON parsing fails
          intentResult = {
            intent: Intent.GENERAL_INQUIRY,
            message:
              response.message.content ||
              "I'm not sure I understood that. Could you please clarify?",
            parameters: null,
          };
        }
      }

      // Handle function calls
      if (response.message.function_call) {
        intentResult.functionCalls = [response.message.function_call];
      }

      return {
        ...intentResult,
        usage: {
          promptTokens: openaiResponse.usage?.prompt_tokens,
          responseTokens: openaiResponse.usage?.completion_tokens,
          totalTokens: openaiResponse.usage?.total_tokens,
          cachedTokens:
            openaiResponse.usage?.prompt_tokens_details?.cached_tokens,
        },
      };
    } catch (error) {
      ConversationService.logger.error("Intent detection failed");
      ConversationService.logJsonError(error);
      return {
        intent: Intent.GENERAL_INQUIRY,
        message: "I'm not sure I understood that. Could you please clarify?",
        parameters: null,
        functionCalls: [],
        usage: {
          promptTokens: 0,
          responseTokens: 0,
          totalTokens: 0,
          cachedTokens: 0,
        },
      };
    }
  }

  async generateContextualResponse({
    intentResult,
    messages,
  }: {
    intentResult: any;
    messages: IMessage[];
  }) {
    // If we have a direct message from intent detection, use it
    if (
      intentResult.message &&
      intentResult.intent !== Intent.GENERAL_INQUIRY
    ) {
      return {
        role: RoleEnum.ASSISTANT,
        content: intentResult.message,
      };
    }

    const contextualResponse = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.3,
      max_tokens: 300,
    });

    return {
      role: RoleEnum.ASSISTANT,
      content:
        contextualResponse.choices[0].message.content ??
        "I'm here to help you. Could you please clarify what you need assistance with?",
    };
  }
}
