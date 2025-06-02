import { config } from "@/config";
import { intentActionsMapper } from "@/constants";
import { Intent, IntentResult, RoleEnum } from "@/enums";
import { appointmentFunctions } from "@/functions";
import { logJsonError } from "@/helpers";
import { logger } from "@/logging";
import { Conversation, IConversation, IMessage } from "@/models";
import { intentDetectionSchema } from "@/schema";
import { CacheService } from "@/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import { Model } from "mongoose";
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
  private readonly conversationModel: Model<IConversation> = Conversation;

  private readonly pinecone: Pinecone;
  private readonly openai: OpenAI;

  private readonly cacheService: CacheService;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey,
      maxRetries: 5,
    });
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.cacheService = CacheService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ConversationService();
    }
    return this.instance;
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

  async startNewConversation(botId: string, businessId: string) {
    const conversation = await this.conversationModel.create({
      conversationId: uuid_v4(),
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

  // async processConversation(conversation: IConversation) {
  //   const totalMessages = conversation.messages.length;

  //   // Get index of last summarized message
  //   const lastSummary =
  //     conversation.summaries[conversation.summaries.length - 1];
  //   const lastSummaryIndex = lastSummary?.endIndex ?? -1;

  //   // Determine how many message since last summary
  //   const unsummarizedCount = totalMessages - (lastSummaryIndex + 1);

  //   let newSummary = null;

  //   if (unsummarizedCount >= this.SUMMARY_TRIGGER_THRESHOLD) {
  //     // Get messages to summarize
  //     const messagesToSummarize = conversation.messages.slice(
  //       lastSummaryIndex + 1,
  //       lastSummaryIndex + 1 + this.SUMMARY_TRIGGER_THRESHOLD
  //     );

  //     // Summarize messages
  //     const summaryText = await this.summarizeMessages(messagesToSummarize);

  //     newSummary = {
  //       content: summaryText,
  //       startIndex: lastSummaryIndex + 1,
  //       endIndex: lastSummaryIndex + this.SUMMARY_TRIGGER_THRESHOLD,
  //     };

  //     // Push new summary to the summary array
  //     conversation.summaries.push(newSummary);

  //     // Save conversation
  //     await conversation.save();
  //   }

  //   const context = {
  //     summaries: conversation.summaries.map((s) => s.content),
  //     unsummarizedMessages: conversation.messages.slice(
  //       (conversation.summaries.at(-1)?.endIndex ?? -1) + 1
  //     ),
  //     userQuery:
  //       conversation.messages.at(-1)?.role === "user"
  //         ? conversation.messages.at(-1)?.content
  //         : null,
  //     lastUnsummarizedMessageRole: conversation.messages.at(-1)?.role,
  //   };

  //   return context;
  // }

  async processConversationOptimized(conversation: IConversation) {
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

    // chatMessages.unshift({
    //   role: RoleEnum.DEVELOPER,
    //   content:
    //     "Summarize this conversation so far between a user and a business chatbot.",
    // });
    chatMessages.unshift({
      role: RoleEnum.DEVELOPER,
      content:
        "Create a concise summary of this conversation between a user and business chatbot, focusing on key topics, requests, and any appointment-related discussions.",
    });

    // chatMessages.push({
    //   role: RoleEnum.USER,
    //   content: "Please summarize the above conversation.",
    // });

    // const summaryResponse = await this.openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: chatMessages,
    // });
    const summaryResponse = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages,
      temperature: 0.2,
      max_completion_tokens: 150,
    });

    return summaryResponse.choices[0].message.content ?? "";
  }

  // async detectUserIntent({
  //   summaries,
  //   unsummarizedMessages,
  //   userQuery,
  //   lastUnsummarizedMessageRole,
  //   extractedKB,
  //   customInstruction,
  // }: {
  //   summaries: string[];
  //   unsummarizedMessages: IMessage[];
  //   userQuery: string;
  //   lastUnsummarizedMessageRole: RoleEnum | undefined;
  //   extractedKB: string;
  //   customInstruction: string;
  // }) {
  //   const developerPrompt = this.createIntentDeveloperPrompt(
  //     summaries,
  //     extractedKB,
  //     customInstruction
  //   );
  //   const openaiResponse = await this.openai.chat.completions.create({
  //     model: "gpt-4",
  //     messages: [
  //       { role: RoleEnum.DEVELOPER, content: developerPrompt },
  //       ...unsummarizedMessages,
  //       ...(lastUnsummarizedMessageRole !== RoleEnum.USER && userQuery
  //         ? [{ role: RoleEnum.USER, content: userQuery }]
  //         : []),
  //     ],
  //     temperature: 0.2,
  //   });
  //   const jsonText = openaiResponse.choices[0].message.content || "";
  //   console.log("Intent response >> ", jsonText);
  //   try {
  //     return JSON.parse(jsonText) as IntentResult;
  //   } catch (e) {
  //     return {
  //       intent: Intent.UNKNOWN,
  //       message:
  //         jsonText ??
  //         "I'm not sure I understood that. Could you please clarify?",
  //       parameters: null,
  //     };
  //   }
  // }

  async detectUserIntentWithFunctions({
    summaries,
    unsummarizedMessages,
    userQuery,
    extractedKB,
    customInstruction,
    currentAppointmentData,
  }: {
    summaries: string[];
    unsummarizedMessages: IMessage[];
    userQuery: string;
    extractedKB: string;
    customInstruction: string;
    currentAppointmentData: string;
  }) {
    const currentDate = new Date().toISOString().split("T")[0];

    const developerPrompt = this.createEnhancedIntentPrompt(
      summaries,
      extractedKB,
      customInstruction,
      currentDate,
      currentAppointmentData
    );

    const messages = [
      { role: RoleEnum.DEVELOPER, content: developerPrompt },
      ...unsummarizedMessages,
      { role: RoleEnum.USER, content: userQuery },
    ];

    // This snippet of code ensure that appointment dates are resolved based on the current date.
    messages.unshift({
      role: RoleEnum.SYSTEM,
      content: `Today's date is ${currentDate}. Always resolve relative dates like "next week" based on this.`,
    });

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

      return intentResult;
    } catch (error) {
      ConversationService.logger.error("Intent detection failed");
      ConversationService.logJsonError(error);
      return {
        intent: Intent.GENERAL_INQUIRY,
        message: "I'm not sure I understood that. Could you please clarify?",
        parameters: null,
        functionCalls: [],
      };
    }
  }

  async generateContextualResponse({
    context,
    extractedKB,
    customInstruction,
    intentResult,
    userQuery,
  }: {
    context: any;
    extractedKB: string;
    customInstruction: string;
    intentResult: any;
    userQuery: string;
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

    // For general inquiries, generate a more contextual response
    const lastAction =
      intentActionsMapper[intentResult.intent as Intent] ||
      intentActionsMapper[Intent.GENERAL_INQUIRY];

    const contextualPrompt = `You are a helpful business chatbot assistant.

    Business Instructions:
    ${customInstruction}

    Knowledge Base Information:
    ${extractedKB}

    Conversation Summaries:
    ${context.summaries.join("\n")}

    Last Action Context:
    ${lastAction}

    Provide a helpful, natural response to the user's query. Be conversational and reference relevant information from the knowledge base when applicable.`;

    const contextualResponse = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: RoleEnum.DEVELOPER, content: contextualPrompt },
        ...context.unsummarizedMessages,
        { role: RoleEnum.USER, content: userQuery },
      ],
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

  //   createIntentDeveloperPrompt(
  //     summaries: string[],
  //     extractedKB: string,
  //     customInstruction: string
  //   ) {
  //     return `
  // You are an intent detection assistant. Classify the user's input into one of the following intents:

  // - BOOK_APPOINTMENT
  // - SET_APPOINTMENT_DATE
  // - SET_APPOINTMENT_TIME
  // - SET_APPOINTMENT_EMAIL
  // - UNKNOWN

  // Extract relevant parameters (e.g., date, time, email) when applicable, in the right format. e.g. date and should come in Date string format when possible

  // Return a JSON response in this format:
  // {
  //   "intent": "INTENT_NAME",
  //   "parameters": {
  //     // optional parameters like "date", "time", "email"
  //   },
  //   "message": "Natural language response to user"
  // }

  // Context (past conversation summaries):
  // ${summaries.join("\n")}
  // Use the following information if applicable to answer user queries:
  // ${extractedKB}

  // ${customInstruction}

  // Strict rule:
  // 1. When you can provide information relevant to what they ask. Be clear about it. Don't get too creative.
  // 2. You response must always follow the provided json format above.
  // `;
  //   }

  createEnhancedIntentPrompt(
    summaries: string[],
    extractedKB: string,
    customInstruction: string,
    currentDate: string,
    currentAppointmentData: string
  ) {
    return `
    You are an advanced intent detection and response assistant for a business chatbot.

    CLASSIFICATION INTENTS:
    - BOOK_APPOINTMENT: User wants to book/schedule an appointment
    - SET_APPOINTMENT_EMAIL: User provides email for appointment (PRIORITY - collect this first)
    - SET_APPOINTMENT_DATE: User provides or wants to set appointment date
    - SET_APPOINTMENT_TIME: User provides or wants to set appointment time  
    - SET_APPOINTMENT_DATE_AND_TIME: User provides or wants to set both date and time in one message
    - GENERAL_INQUIRY: General questions, information requests, or other business-related queries
    - END_CONVERSATION: If the user says things like "no further inquiry", "that's all", or "I'm done", "nothing else", "that will be all for now", "thank you for your time". 

    FUNCTION CALLING REQUIREMENTS:
    1. When the user provides email, date, and time (either gradually or via SET_APPOINTMENT_DATE_AND_TIME), emit all three related function calls:
      set_appointment_email
      set_appointment_date
      set_appointment_time
    This is required even if some values were already set earlier, for reinforcement and consistency.
    Emit these function calls at the end of the appointment flow or during SET_APPOINTMENT_DATE_AND_TIME. 

    APPOINTMENT BOOKING FLOW:
    1. First collect EMAIL (most important)
    2. Then collect DATE
    3. Finally collect TIME
    4. Confirm appointment

    CONTEXT INFORMATION:
    Business Instructions: ${customInstruction}

    Knowledge Base: ${extractedKB}

    Conversation History: ${summaries.join("\n")}

    ${currentAppointmentData}

    RESPONSE REQUIREMENTS:
    1. Always return valid JSON in the specified schema
    2. Provide natural, helpful messages
    3. Use knowledge base information when relevant
    4. For appointments, follow the email → date → time sequence
    5. Confirm appointment once email, date, and time are all collected — either together or in separate steps.
    6. Be conversational and professional
    7. Extract parameters accurately (email format, date as YYYY-MM-DD, time as HH:MM)
    8. Treat relative dates like "next Friday", "tomorrow", "next tomorrow" relative to the current date: ${currentDate}

    Your response must be valid JSON with "intent", "message", and optional "parameters" fields.`;
  }
}
