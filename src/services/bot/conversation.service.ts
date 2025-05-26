import { config } from "@/config";
import { Intent, IntentResult, RoleEnum } from "@/enums";
import { Conversation, IConversation, IMessage } from "@/models";
import { CacheService } from "@/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import { Model } from "mongoose";
import OpenAI from "openai";
import { v4 as uuid_v4 } from "uuid";

export class ConversationService {
  private static instance: ConversationService;
  private readonly SUMMARY_TRIGGER_THRESHOLD = 10;
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

  async processConversation(conversation: IConversation) {
    const totalMessages = conversation.messages.length;

    // Get index of last summarized message
    const lastSummary =
      conversation.summaries[conversation.summaries.length - 1];
    const lastSummaryIndex = lastSummary?.endIndex ?? -1;

    // Determine how many message since last summary
    const unsummarizedCount = totalMessages - (lastSummaryIndex + 1);

    let newSummary = null;

    if (unsummarizedCount >= this.SUMMARY_TRIGGER_THRESHOLD) {
      // Get messages to summarize
      const messagesToSummarize = conversation.messages.slice(
        lastSummaryIndex + 1,
        lastSummaryIndex + 1 + this.SUMMARY_TRIGGER_THRESHOLD
      );

      // Summarize messages
      const summaryText = await this.summarizeMessages(messagesToSummarize);

      newSummary = {
        content: summaryText,
        startIndex: lastSummaryIndex + 1,
        endIndex: lastSummaryIndex + this.SUMMARY_TRIGGER_THRESHOLD,
      };

      // Push new summary to the summary array
      conversation.summaries.push(newSummary);

      // Save conversation
      await conversation.save();
    }

    const context = {
      summaries: conversation.summaries.map((s) => s.content),
      unsummarizedMessages: conversation.messages.slice(
        (conversation.summaries.at(-1)?.endIndex ?? -1) + 1
      ),
      userQuery:
        conversation.messages.at(-1)?.role === "user"
          ? conversation.messages.at(-1)?.content
          : null,
      lastUnsummarizedMessageRole: conversation.messages.at(-1)?.role,
    };

    return context;
  }

  async summarizeMessages(messages: IMessage[]) {
    const chatMessages = messages.map((msg) => ({
      role: msg.role, // assuming msg.role is "user" or "assistant"
      content: msg.content,
    }));

    chatMessages.unshift({
      role: RoleEnum.DEVELOPER,
      content:
        "Summarize this conversation so far between a user and a business chatbot.",
    });

    chatMessages.push({
      role: RoleEnum.USER,
      content: "Please summarize the above conversation.",
    });

    const summaryResponse = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: chatMessages,
    });

    return summaryResponse.choices[0].message.content ?? "";
  }

  async detectUserIntent({
    summaries,
    unsummarizedMessages,
    userQuery,
    lastUnsummarizedMessageRole,
  }: {
    summaries: string[];
    unsummarizedMessages: IMessage[];
    userQuery: string;
    lastUnsummarizedMessageRole: RoleEnum | undefined;
  }) {
    const developerPrompt = this.createIntentDeveloperPrompt(summaries);
    const openaiResponse = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: RoleEnum.DEVELOPER, content: developerPrompt },
        ...unsummarizedMessages,
        ...(lastUnsummarizedMessageRole !== RoleEnum.USER && userQuery
          ? [{ role: RoleEnum.USER, content: userQuery }]
          : []),
      ],
      temperature: 0.2,
    });
    const jsonText = openaiResponse.choices[0].message.content || "";
    console.log("Intent response >> ", jsonText);
    try {
      return JSON.parse(jsonText) as IntentResult;
    } catch (e) {
      return {
        intent: Intent.UNKNOWN,
        message:
          jsonText ??
          "I'm not sure I understood that. Could you please clarify?",
        parameters: null,
      };
    }
  }

  createIntentDeveloperPrompt(summaries: string[]) {
    return `
You are an intent detection assistant. Classify the user's input into one of the following intents:

- BOOK_APPOINTMENT
- SET_APPOINTMENT_DATE
- SET_APPOINTMENT_TIME
- SET_APPOINTMENT_EMAIL
- UNKNOWN

Extract relevant parameters (e.g., date, time, email) when applicable.

Return a JSON response in this format:
{
  "intent": "INTENT_NAME",
  "parameters": {
    // optional parameters like "date", "time", "email"
  },
  "message": "Natural language response to user"
}

Context (past conversation summaries):
${summaries.join("\n")}

Strict rule:
1. When you can provide information relevant to what they ask. Be clear about it. Don't get too creative.
2. You response must always follow the provided format above.
`;
  }
}
