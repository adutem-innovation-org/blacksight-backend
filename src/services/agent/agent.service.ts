import { throwNotFoundError } from "@/helpers";
import { AuthData } from "@/interfaces";
import { Bot, IBot, IConversation } from "@/models";
import { Model } from "mongoose";
import { ConversationService } from "../bot";
import { RoleEnum } from "@/enums";

export class AgentService {
  private static instance: AgentService;

  private readonly agentModel: Model<IBot> = Bot;
  private readonly conversationService: ConversationService;

  constructor() {
    this.conversationService = ConversationService.getInstance();
  }

  static getInstance(): AgentService {
    if (!this.instance) {
      this.instance = new AgentService();
    }
    return this.instance;
  }

  async connect(authData: AuthData, agentId: string, sessionId: string) {
    const agent = await this.agentModel.findOne({
      _id: agentId,
      businessId: authData.userId,
    });
    if (!agent)
      return throwNotFoundError(
        "Error occured while connecting to because this agent is unknown. Ensure you provided a valid agent identifier."
      );

    for (let i = 0; i < 30_000; i++) {
      console.log(i);
    }

    let conversation: IConversation | null = null;
    try {
      conversation = await this.conversationService.getOrCreateConversation(
        sessionId,
        agentId,
        authData.userId
      );
    } catch (error) {}

    if (conversation?.messages.length === 0) {
      const newMessage = {
        role: RoleEnum.ASSISTANT,
        content: agent.welcomeMessage,
      };
      conversation.messages.push(newMessage);
      await conversation.save();
    }

    return {
      agent,
      chatHistory: conversation?.messages ?? [
        {
          role: RoleEnum.ASSISTANT,
          content: agent.welcomeMessage,
        },
      ],
    };
  }
}
