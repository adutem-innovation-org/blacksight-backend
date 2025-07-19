import { NextFunction, Request, Response } from "express";
import { WalletService } from "../wallet";
import { logJsonError, throwUnprocessableEntityError } from "@/helpers";
import { encoding_for_model } from "@dqbd/tiktoken";
import {
  Events,
  TokenizedOperations,
  WalletTransactionCategory,
  WalletTransactionDescription,
} from "@/enums";
import { randomUUID } from "crypto";
import { Model } from "mongoose";
import { ISettings, ITokenLog, TokenLog } from "@/models";
import { GenericReq } from "@/interfaces";
import { AskChatbotDto } from "@/decorators";
import { SettingsService } from "../settings";
import { config } from "@/config";
import { eventEmitter } from "@/utils";
import EventEmitter2 from "eventemitter2";
const enc = encoding_for_model("gpt-4");

export class TokenizationService {
  private static instance: TokenizationService;
  private static logJsonError = logJsonError;

  private static readonly enc = enc;
  private static readonly eventEmitter: EventEmitter2 = eventEmitter;

  private readonly tokenLogModel: Model<ITokenLog> = TokenLog;

  private readonly walletService: WalletService;
  private static staticWalletService: WalletService =
    WalletService.getInstance();
  private readonly settingsService: SettingsService;

  constructor() {
    this.walletService = WalletService.getInstance();
    this.settingsService = SettingsService.getInstance();
    this._setupEventListeners();
  }

  private _setupEventListeners() {
    TokenizationService.eventEmitter.on(
      Events.CHARGE_READ_KNOWLEDGE_BASE,
      (payload) => this._chargeKBRead(payload)
    );
    TokenizationService.eventEmitter.on(
      Events.CHARGE_WRITE_KNOWLEDGE_BASE,
      (payload) => this._chargeKBWrite(payload)
    );
    TokenizationService.eventEmitter.on(
      Events.CHARGE_CHAT_COMPLETION,
      (payload) => this.chargeChatCompletion(payload)
    );
    TokenizationService.eventEmitter.on(
      Events.CHARGE_AUDIO_TRANSCRIPTION,
      (payload) => this._chargeTranscription(payload)
    );
  }
  static getInstance(): TokenizationService {
    if (!this.instance) {
      this.instance = new TokenizationService();
    }
    return this.instance;
  }

  static async balanceCheckMiddleware(
    req: GenericReq<AskChatbotDto>,
    res: Response,
    next: NextFunction
  ) {
    const userQueryToken = TokenizationService.measureToken(req.body.userQuery);

    const haveEnoughBalance = await this.staticWalletService.canDeductBalance(
      req.apiKeyOwnerId!,
      Math.max(userQueryToken, 50)
    );

    if (!haveEnoughBalance)
      return throwUnprocessableEntityError("Insufficient balance");

    return next();
  }

  static measureToken(text: string) {
    try {
      const tokens = TokenizationService.enc.encode(text);
      enc.free();
      return tokens.length;
    } catch (error) {
      console.log("Token estimation error:", error);
      return 0;
    }
  }

  async canPrompt(prompt: string, userId: string) {
    const tokenCount = TokenizationService.measureToken(prompt);

    const wallet = await this.walletService.getOrCreateWallet(userId);

    return wallet.balance > tokenCount;
  }

  async chargeChatCompletion({
    promptTokens,
    responseTokens,
    cachedTokens,
    userId,
    botId,
    businessId,
    sessionId,
  }: {
    promptTokens: number;
    responseTokens: number;
    cachedTokens: number;
    userId: string;
    botId: string;
    businessId: string;
    sessionId: string;
  }) {
    try {
      const { totalTokens } = await this._computeChatTokens({
        promptTokens,
        responseTokens,
        cachedTokens,
      });

      const reference = randomUUID();

      // Create a token log
      const tokenLog = await this.tokenLogModel.create({
        businessId,
        botId,
        sessionId,
        operationType: TokenizedOperations.CHAT_COMPLETION,
        promptTokens,
        responseTokens,
        totalTokens,
        userPrompt: prompt,
        reference,
      });

      await this.walletService.deductToken(
        WalletTransactionCategory.CHAT_COMPLETION,
        totalTokens,
        reference,
        userId,
        WalletTransactionDescription.CHAT_COMPLETION,
        tokenLog._id.toString(),
        sessionId
      );
    } catch (error) {
      TokenizationService.logJsonError(error);
    }
  }

  private async _computeChatTokens({
    promptTokens,
    responseTokens,
    cachedTokens,
  }: {
    promptTokens: number;
    responseTokens: number;
    cachedTokens: number;
  }) {
    const settings = await this._initSettings();
    const promptTokensCost =
      (promptTokens - cachedTokens) * settings.costPerPromptToken;
    const cachedTokensCost = cachedTokens * settings.costPerCachedPromptToken;
    const responseTokensCost = responseTokens * settings.costPerCompletionToken;

    const totalCost = promptTokensCost + responseTokensCost + cachedTokensCost;
    console.log("Total cost >> ", totalCost);

    const bTokens = totalCost / settings.costPerToken;
    console.log("Estimated bToken >> ", bTokens);

    const markup = totalCost * (settings.chatCompletionMarkUpPercent / 100);
    console.log("Markup >> ", markup);

    const totalCostWithMarkup = totalCost + markup;
    console.log("Total cost with markup >> ", totalCostWithMarkup);

    const bTokensWithMarkup = totalCostWithMarkup / settings.costPerToken;
    console.log("Estimated bToken with markup >> ", bTokensWithMarkup);
    return { totalTokens: parseFloat(bTokensWithMarkup.toFixed(1)) };
  }

  private async _chargeKBRead({
    userId,
    businessId,
    sessionId,
    embeddingTokens,
    readUnits,
  }: {
    embeddingTokens: number;
    readUnits: number;
    userId: string;
    businessId: string;
    sessionId: string;
  }) {
    try {
      const { totalTokens } = await this._computeKBReadTokens({
        embeddingTokens,
        readUnits,
      });

      const reference = randomUUID();

      // Create a token log
      const tokenLog = await this.tokenLogModel.create({
        businessId,
        operationType: TokenizedOperations.KNOWLEDGE_BASE_READ,
        sessionId,
        embeddingTokens,
        readUnits,
        totalTokens,
        reference,
      });

      await this.walletService.deductToken(
        WalletTransactionCategory.KNOWLEDGE_BASE_READ,
        totalTokens,
        reference,
        userId,
        WalletTransactionDescription.KNOWLEDGE_BASE_READ,
        tokenLog._id.toString(),
        sessionId
      );
    } catch (error) {
      TokenizationService.logJsonError(error);
    }
  }

  private async _computeKBReadTokens({
    embeddingTokens,
    readUnits,
  }: {
    embeddingTokens: number;
    readUnits: number;
  }) {
    const settings = await this._initSettings();

    const markedUpEmbeddingTokensCost = this._computeMarkedUpEmbeddingCost(
      embeddingTokens,
      settings
    );

    const readUnitsCost = readUnits * settings.costPerRU;

    const markupedReadUnitsCost =
      readUnitsCost + (readUnitsCost * settings.markUpPercent) / 100;

    const totalCost = markedUpEmbeddingTokensCost + markupedReadUnitsCost;
    console.log("Total cost >> ", totalCost);

    const bTokens = totalCost / settings.costPerToken;
    console.log("Estimated bToken >> ", bTokens);

    return { totalTokens: parseFloat(bTokens.toFixed(1)) };
  }

  private async _chargeKBWrite({
    userId,
    businessId,
    embeddingTokens,
    writeUnits,
  }: {
    embeddingTokens: number;
    writeUnits: number;
    userId: string;
    businessId: string;
  }) {
    try {
      const { totalTokens } = await this._computeKBWriteTokens({
        embeddingTokens,
        writeUnits,
      });

      const reference = randomUUID();

      // Create a token log
      const tokenLog = await this.tokenLogModel.create({
        businessId,
        operationType: TokenizedOperations.KNOWLEDGE_BASE_WRITE,
        embeddingTokens,
        writeUnits,
        totalTokens,
        reference,
      });

      await this.walletService.deductToken(
        WalletTransactionCategory.KNOWLEDGE_BASE_WRITE,
        totalTokens,
        reference,
        userId,
        WalletTransactionDescription.KNOWLEDGE_BASE_WRITE,
        tokenLog._id.toString()
      );
    } catch (error) {
      TokenizationService.logJsonError(error);
    }
  }

  private async _computeKBWriteTokens({
    embeddingTokens,
    writeUnits,
  }: {
    embeddingTokens: number;
    writeUnits: number;
  }) {
    const settings = await this._initSettings();

    const markedUpEmbeddingTokensCost = this._computeMarkedUpEmbeddingCost(
      embeddingTokens,
      settings
    );

    const writeUnitsCost = writeUnits * settings.costPerWU;

    const markupedWriteUnitsCost =
      writeUnitsCost + (writeUnitsCost * settings.markUpPercent) / 100;

    const totalCost = markedUpEmbeddingTokensCost + markupedWriteUnitsCost;
    console.log("Total cost >> ", totalCost);

    const bTokens = totalCost / settings.costPerToken;
    console.log("Estimated bToken >> ", bTokens);

    return { totalTokens: parseFloat(bTokens.toFixed(1)) };
  }

  private _computeMarkedUpEmbeddingCost(
    embeddingTokens: number,
    settings: ISettings
  ) {
    const embeddingTokensCost =
      embeddingTokens * settings.costPerEmbeddingToken;

    const markupedEmbeddingTokensCost =
      embeddingTokensCost +
      (embeddingTokensCost * settings.embeddingsMarkUpPercent) / 100;
    return markupedEmbeddingTokensCost;
  }

  private async _chargeTranscription({
    userId,
    businessId,
    // sessionId,
    transcriptionMinutes,
    botId,
  }: {
    transcriptionMinutes: number;
    userId: string;
    businessId: string;
    // sessionId: string;
    botId: string;
  }) {
    try {
      const { totalTokens } = await this.computeTranscriptionTokens({
        transcriptionMinutes,
      });

      const reference = randomUUID();

      // Create a token log
      const tokenLog = await this.tokenLogModel.create({
        businessId,
        botId,
        operationType: TokenizedOperations.SPEECH_TO_TEXT,
        totalTokens,
        transcriptionMinutes,
        reference,
      });

      await this.walletService.deductToken(
        WalletTransactionCategory.SPEECH_TO_TEXT,
        totalTokens,
        reference,
        userId,
        WalletTransactionDescription.SPEECH_TO_TEXT,
        tokenLog._id.toString()
      );
    } catch (error) {
      TokenizationService.logJsonError(error);
    }
  }

  async computeTranscriptionTokens({
    transcriptionMinutes,
  }: {
    transcriptionMinutes: number;
  }) {
    const settings = await this._initSettings();

    const transcriptionMinutesCost =
      transcriptionMinutes * settings.costPerTranscriptionMinute;

    const markedupTranscriptionMinutesCost =
      transcriptionMinutesCost +
      (transcriptionMinutesCost * settings.transcriptionMarkUpPercent) / 100;

    console.log("Total cost >> ", markedupTranscriptionMinutesCost);

    const bTokens = markedupTranscriptionMinutesCost / settings.costPerToken;
    console.log("Estimated bToken >> ", bTokens);

    return { totalTokens: parseFloat(bTokens.toFixed(1)) };
  }

  private async _initSettings() {
    let settings: ISettings;
    try {
      settings = (await this.settingsService.findAll()).data!;
    } catch (error) {
      settings = config.settings as ISettings;
    }
    return settings;
  }
}
