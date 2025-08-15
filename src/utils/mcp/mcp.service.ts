import { fallbackPrompt } from "@/constants";
import { RoleEnum, UserActions } from "@/enums";
import { IBot, IMessage } from "@/models";
import {
  AppointmentService,
  BotSharedService,
  ConversationService,
  KnowledgeBaseService,
  Recommender,
} from "@/services";
import fs from "fs";
import path from "path";

export class McpService {
  private static instance: McpService;

  private readonly conversationService: ConversationService;
  private readonly appointmentService: AppointmentService;
  private readonly botSharedService: BotSharedService;
  private readonly knowledgeBaseService: KnowledgeBaseService;
  private readonly recommender: Recommender;

  constructor() {
    this.conversationService = ConversationService.getInstance();
    this.appointmentService = AppointmentService.getInstance();
    this.botSharedService = BotSharedService.getInstance();
    this.knowledgeBaseService = KnowledgeBaseService.getInstace();
    this.recommender = Recommender.getInstance();
  }

  static getInstance(): McpService {
    if (!this.instance) {
      this.instance = new McpService();
    }
    return this.instance;
  }

  async buildMCPContext({
    bot,
    appointmentId,
    conversationId,
    businessId,
    userQuery,
    liveChat = false,
    action,
  }: {
    bot: IBot;
    appointmentId: string;
    conversationId: string;
    businessId: string;
    userQuery: string;
    liveChat?: boolean;
    action?: UserActions;
  }) {
    const botId = bot._id.toString();

    // Get current session's appointment context
    const appointmentContext =
      await this.appointmentService.constructAppoinmentAsContext(appointmentId);

    // Get or create conversation
    let conversation = await this.conversationService.getOrCreateConversation(
      conversationId,
      botId,
      businessId
    );

    // Process conversation with optimized context
    const { summaries, unsummarizedMessages } =
      await this.conversationService.processConversation(conversation);

    // Save user message
    // ✅ This approach was reversed because we don't want to summarize the message the user just sent... Rather we want to summarize only past conversation if they are up to the required threshold
    conversation = await this.conversationService.saveUserMessage(
      conversation,
      userQuery
    );

    // Skip KB extraction if the operation is a form completion or cancellation
    let shouldExtractKB = true;
    if (action) shouldExtractKB = false;

    // Extract relevant knowledge base
    const extractedKB = shouldExtractKB
      ? await this.knowledgeBaseService.extractKnowledgeBase(
          bot,
          businessId,
          userQuery
        )
      : "";

    // Extract product recommendations - only when needed
    let extractedProducts = "";
    const isProductRecommendationQuery =
      Recommender.isProductRecommendationQuery(userQuery);

    if (shouldExtractKB && isProductRecommendationQuery) {
      console.log(
        `Detected product recommendatio query: ${userQuery.substring(0, 50)}...`
      );
      extractedProducts = await this.recommender.extractProductRecommendations(
        bot,
        businessId,
        userQuery
      );
      console.log(
        `Product extraction result: ${extractedProducts.substring(0, 100)}...`
      );
    }
    console.log("Extracted products: ", extractedProducts);

    // Get custom instructions
    const customInstruction =
      bot.instructions ?? "No custom instruction from the business.";

    // Current date for proper appointment date referencing
    const currentDate = new Date().toISOString().split("T")[0];

    // Instruction on how the bot should behave and the right contexts
    const developerPrompt = await this.createDeveloperPrompt(
      summaries,
      extractedKB,
      extractedProducts,
      customInstruction,
      currentDate,
      appointmentContext,
      liveChat,
      action
    );

    // Messages array for LLM
    const messages = this.buildBotMessages({
      developerPrompt,
      unsummarizedMessages,
      userQuery,
    });

    return {
      unsummarizedMessages,
      messages,
      summaries,
      extractedKB,
      extractedProducts,
      customInstruction,
    };
  }

  buildBotMessages({
    developerPrompt,
    unsummarizedMessages,
    userQuery,
  }: {
    developerPrompt: string;
    unsummarizedMessages: IMessage[];
    userQuery: string;
  }) {
    // Current date for proper appointment date referencing
    const currentDate = new Date().toISOString().split("T")[0];

    const messages = this.buildMessages({
      prompt: developerPrompt,
      unsummarizedMessages,
      userQuery,
    });

    // This snippet of code ensure that appointment dates are resolved based on the current date.
    messages.unshift({
      role: RoleEnum.SYSTEM,
      content: `Today's date is ${currentDate}. Always resolve relative dates like "next week" based on this.`,
    });

    return messages;
  }

  async createDeveloperPrompt(
    summaries: string[],
    extractedKB: string,
    extractedProducts: string,
    customInstruction: string,
    currentDate: string,
    appointmentContext: string,
    liveChat: boolean,
    action?: UserActions
  ): Promise<string> {
    let filePath: string;

    if (liveChat) {
      filePath = path.resolve(__dirname, "../../data/live_chat_prompt.txt");
    } else {
      filePath = path.resolve(__dirname, "../../data/training_prompt.txt");
    }

    try {
      // const fileContent = fs.readFileSync(filePath, "utf8");
      const fileContent = await fs.promises.readFile(filePath, "utf8");

      const prompt = fileContent
        .replace(/{{summaries}}/g, summaries.join("\n"))
        .replace(/{{extractedKB}}/g, extractedKB)
        .replace(/{{extractedProducts}}/g, extractedProducts)
        .replace(/{{customInstruction}}/g, customInstruction)
        .replace(/{{currentDate}}/g, currentDate)
        .replace(/{{appointmentContext}}/g, appointmentContext)
        .replace(/{{userAction}}/g, action ?? "IGNORE");

      return prompt;
    } catch (error) {
      return fallbackPrompt({
        summaries,
        extractedKB,
        extractedProducts,
        customInstruction,
        currentDate,
        appointmentContext,
        action,
      });
    }
  }

  buildMessages({
    prompt,
    unsummarizedMessages,
    userQuery,
  }: {
    prompt: string;
    unsummarizedMessages: IMessage[];
    userQuery: string;
  }) {
    return [
      { role: RoleEnum.DEVELOPER, content: prompt },
      ...unsummarizedMessages,
      { role: RoleEnum.USER, content: userQuery },
    ];
  }

  // createContextualPrompt(
  //   summaries: string[],
  //   extractedKB: string,
  //   customInstruction: string,
  //   lastAction: string
  // ) {
  //   const contextualPrompt = `You are a helpful business chatbot assistant.

  //       Business Instructions:
  //       ${customInstruction}

  //       Knowledge Base Information:
  //       ${extractedKB}

  //       Conversation Summaries:
  //       ${summaries.join("\n")}

  //       Last Action Context:
  //       ${lastAction}

  //       Provide a helpful, natural response to the user's query. Be conversational and reference relevant information from the knowledge base when applicable.`;

  //   return contextualPrompt;
  // }

  /**
   * Create specialized prompt for product recommendations
   */
  createProductRecommendationPrompt(
    summaries: string[],
    extractedKB: string,
    extractedProducts: string,
    customInstruction: string,
    userQuery: string
  ): string {
    return `You are a helpful product recommendation assistant for this business.

CONVERSATION CONTEXT:
${summaries.length > 0 ? summaries.join("\n") : "No previous conversation"}

BUSINESS KNOWLEDGE:
${extractedKB || "No general business knowledge available"}

AVAILABLE PRODUCTS/SERVICES:
${extractedProducts}

BUSINESS INSTRUCTIONS:
${customInstruction}

USER QUERY: ${userQuery}

INSTRUCTIONS:
1. Based on the user's query and the available products/services above, provide personalized recommendations
2. Explain why these products/services would be suitable for their needs
3. Include relevant details like features, benefits, or pricing if available in the product data
4. Be conversational and helpful
5. If the user's needs are unclear, ask clarifying questions to provide better recommendations
6. Focus only on the products/services available in the AVAILABLE PRODUCTS/SERVICES section
7. If multiple products are suitable, rank them by relevance to the user's needs
8. Use a friendly, consultative tone as if you're a knowledgeable sales assistant

Generate a helpful product recommendation response:`;
  }

  /**
   * Create contextual prompt for general inquiries
   */
  createContextualPrompt(
    summaries: string[],
    extractedKB: string,
    customInstruction: string,
    lastAction: string
  ): string {
    return `You are a helpful business assistant.

CONVERSATION CONTEXT:
${summaries.length > 0 ? summaries.join("\n") : "No previous conversation"}

BUSINESS KNOWLEDGE:
${extractedKB || "No business knowledge available"}

BUSINESS INSTRUCTIONS:
${customInstruction}

LAST ACTION: ${lastAction}

INSTRUCTIONS:
1. Provide helpful, accurate information based on the business knowledge
2. Be conversational and professional
3. If you don't have specific information, acknowledge it politely
4. Offer alternative ways to help the user
5. Stay focused on business-related topics

Generate a helpful response:`;
  }
}
