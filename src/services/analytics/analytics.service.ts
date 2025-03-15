import { AppointmentStatus, BotStatus } from "@/enums";
import { AuthData } from "@/interfaces";
import {
  Appointment,
  Bot,
  Conversation,
  IAppointment,
  IBot,
  IConversation,
  IKnowledgeBase,
  IUser,
  KnowledgeBase,
  User,
} from "@/models";
import { Model, Types } from "mongoose";

export class AnalyticsService {
  private static instance: AnalyticsService;

  private readonly appointmentModel: Model<IAppointment> = Appointment;
  private readonly botModel: Model<IBot> = Bot;
  private readonly conversationModel: Model<IConversation> = Conversation;
  private readonly knowledgeBaseModel: Model<IKnowledgeBase> = KnowledgeBase;
  private readonly userModel: Model<IUser> = User;

  constructor() {}

  static getInstance(): AnalyticsService {
    if (!this.instance) {
      this.instance = new AnalyticsService();
    }
    return this.instance;
  }

  async getUserAnalytics(authData: AuthData) {
    const query = { businessId: new Types.ObjectId(authData.userId) };
    const result = await Promise.allSettled([
      this.appointmentModel
        .countDocuments({ status: AppointmentStatus.PENDING, ...query })
        .exec(),
      this.botModel
        .countDocuments({ status: BotStatus.ACTIVE, ...query })
        .exec(),
      this.conversationModel.countDocuments({ ...query }).exec(),
      this.knowledgeBaseModel.countDocuments({ ...query }).exec(),
    ]);

    return {
      data: {
        totalAppointments:
          result[0].status == "fulfilled" ? result[0].value : 0,
        totalBots: result[1].status == "fulfilled" ? result[1].value : 0,
        totalConversations:
          result[2].status == "fulfilled" ? result[2].value : 0,
        totalKnowledgeBase:
          result[3].status == "fulfilled" ? result[3].value : 0,
      },
    };
  }

  async getAdminAnalytics(authData: AuthData) {
    const result = await Promise.allSettled([
      this.appointmentModel.countDocuments().exec(),
      this.botModel.countDocuments().exec(),
      this.conversationModel.countDocuments().exec(),
      this.knowledgeBaseModel.countDocuments().exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return {
      data: {
        totalAppointments:
          result[0].status == "fulfilled" ? result[0].value : 0,
        totalBots: result[1].status == "fulfilled" ? result[1].value : 0,
        totalConversations:
          result[2].status == "fulfilled" ? result[2].value : 0,
        totalKnowledgeBase:
          result[3].status == "fulfilled" ? result[3].value : 0,
        totalUsers: result[4].status == "fulfilled" ? result[4].value : 0,
      },
    };
  }
}
