import { BotStatus } from "@/enums";
import { isOwnerUser, isSuperAdmin, logJsonError } from "@/helpers";
import { AuthData } from "@/interfaces";
import { Bot, IBot } from "@/models";
import { Model, Types } from "mongoose";

// This service was created to overcome the issue of looping in the call stack.
// The method in this service were initially part of the BotService, but because knowledgebase service is imported in the bot service, we cannot import the bot service in the knowledgebase service as well, as this results in a callstack loop.
// To fix we create a shared service that makes methods from the bots service,that are needed in the knowledgebase service accessible.
export class BotSharedService {
  private static instance: BotSharedService;

  // Helpers
  private static readonly logJsonError = logJsonError;

  // Models
  private readonly botModel: Model<IBot> = Bot;

  constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new BotSharedService();
    }
    return this.instance;
  }

  /**
   * This service method deactivates bot that are associated to a particular knowledgebase.
   * @param auth The current authenticated entity that issued this action
   * @param knowledgeBaseId The mongodb identifier of the knowledge base to be deleted
   */
  async deactivateBotsByKbId(auth: AuthData, knowledgeBaseId: string) {
    try {
      const allAssociatedBots = await this.botModel.find({
        knowledgeBaseId: new Types.ObjectId(knowledgeBaseId),
      });

      if (allAssociatedBots.length === 0) return;

      const botDeactivationPromises = allAssociatedBots
        .filter(
          (bot) => isOwnerUser(auth, bot.businessId) || isSuperAdmin(auth)
        )
        .map(async (bot) => {
          bot.status = BotStatus.INACTIVE;
          bot.isActive = false;
          await bot.save();
        });

      await Promise.allSettled(botDeactivationPromises);
    } catch (error) {
      BotSharedService.logJsonError(error);
    }
  }
}
