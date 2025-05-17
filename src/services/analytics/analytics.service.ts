import { AppointmentStatus, BotStatus } from "@/enums";
import { AuthData } from "@/interfaces";
import {
  Admin,
  Appointment,
  Bot,
  Conversation,
  IAdmin,
  IAppointment,
  IBot,
  IConversation,
  IKnowledgeBase,
  IReminder,
  IUser,
  KnowledgeBase,
  Reminder,
  User,
} from "@/models";
import { Model, Types } from "mongoose";

export class AnalyticsService {
  private static instance: AnalyticsService;

  private readonly reminderModel: Model<IReminder> = Reminder;
  private readonly appointmentModel: Model<IAppointment> = Appointment;
  private readonly botModel: Model<IBot> = Bot;
  private readonly conversationModel: Model<IConversation> = Conversation;
  private readonly knowledgeBaseModel: Model<IKnowledgeBase> = KnowledgeBase;
  private readonly userModel: Model<IUser> = User;
  private readonly adminModel: Model<IAdmin> = Admin;

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
      this.appointmentModel.countDocuments({ ...query }).exec(),
      this.reminderModel.countDocuments({ ...query }).exec(),
      this.botModel.countDocuments({ ...query }).exec(),
      this.conversationModel.countDocuments({ ...query }).exec(),
      this.knowledgeBaseModel.countDocuments({ ...query }).exec(),
    ]);

    return {
      data: {
        totalAppointments:
          result[0].status == "fulfilled" ? result[0].value : 0,
        totalReminders: result[1].status === "fulfilled" ? result[1].value : 0,
        totalBots: result[2].status == "fulfilled" ? result[2].value : 0,
        totalConversations:
          result[3].status == "fulfilled" ? result[3].value : 0,
        totalKnowledgeBase:
          result[4].status == "fulfilled" ? result[4].value : 0,
      },
    };
  }

  async getAdminAnalytics(authData: AuthData) {
    const result = await Promise.allSettled([
      this.userModel.countDocuments().exec(),
      this.appointmentModel.countDocuments().exec(),
      this.botModel.countDocuments().exec(),
      this.adminModel.countDocuments().exec(),
    ]);

    return {
      data: {
        totalUsers: result[0].status == "fulfilled" ? result[0].value : 0,
        totalAppointments:
          result[1].status == "fulfilled" ? result[1].value : 0,
        totalBots: result[2].status == "fulfilled" ? result[2].value : 0,
        totalAdmins: result[3].status == "fulfilled" ? result[3].value : 0,
      },
    };
  }
}
