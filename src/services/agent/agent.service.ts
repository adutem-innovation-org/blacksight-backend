import { throwNotFoundError, throwUnprocessableEntityError } from "@/helpers";
import { AuthData } from "@/interfaces";
import { Bot, IBot, IConversation } from "@/models";
import { Model } from "mongoose";
import { BotService, ConversationService } from "../bot";
import { RoleEnum } from "@/enums";
import { AudioConverter, CacheService } from "@/utils";
import { Types } from "mongoose";
import fs from "fs";
import path from "path";
import { config } from "@/config";
import OpenAI from "openai";
import { AskAgentDto } from "@/decorators";

export class AgentService {
  private static instance: AgentService;

  private readonly agentModel: Model<IBot> = Bot;

  private readonly botService: BotService;
  private readonly conversationService: ConversationService;
  private readonly cacheService: CacheService;
  private readonly openai: OpenAI;

  constructor() {
    this.botService = BotService.getInstance();
    this.conversationService = ConversationService.getInstance();
    this.cacheService = CacheService.getInstance();
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
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

    // for (let i = 0; i < 30_000; i++) {
    //   console.log(i);
    // }

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

  async ask(
    authData: AuthData,
    agentId: string,
    sessionId: string,
    data: AskAgentDto
  ) {
    return await this.botService.chat(
      agentId,
      sessionId,
      authData.userId.toString(),
      data.userQuery,
      authData
    );
  }

  async speechToText(
    authData: AuthData,
    audioFile: Express.Multer.File,
    agentId: string
  ) {
    // Get bot configuration
    let agent: IBot | null = await this.cacheService.get(agentId);
    if (!agent) {
      agent = await this.agentModel.findOne({
        _id: new Types.ObjectId(agentId),
        businessId: new Types.ObjectId(authData.userId),
      });
    }
    if (!agent) {
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
      } catch (error) {}

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(convertedPath),
        model: "whisper-1",
      });

      return { text: transcription.text };
    } catch (error) {
      return throwUnprocessableEntityError("Unable to transcribe audio");
    } finally {
      try {
        await fs.promises.unlink(audioFile.path);
      } catch (err: any) {}

      try {
        await fs.promises.unlink(convertedPath);
      } catch (err: any) {}
    }
  }
}
