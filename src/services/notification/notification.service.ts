import { AuthData } from "@/interfaces";
import { INotification, Notification } from "@/models";
import { PaginationService } from "@/utils";
import { Model, Types } from "mongoose";

export class NotificationService {
  private static instance: NotificationService;

  // Model
  private readonly notificationModel: Model<INotification> = Notification;

  // Pagination
  private readonly paginationService: PaginationService<INotification>;

  constructor() {
    this.paginationService = new PaginationService(this.notificationModel);
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  async getAllNotifications(auth: AuthData, page: number = 1) {
    const result = await this.paginationService.paginate(
      {
        query: { businessId: new Types.ObjectId(auth.userId) },
        sort: { createdAt: -1 },
        limit: 20,
        page,
      },
      []
    );
    return result;
  }

  async markAllAsRead(auth: AuthData) {
    await this.notificationModel.updateMany(
      {
        read: false,
        businessId: new Types.ObjectId(auth.userId),
      },
      { read: true }
    );

    return { message: "All notifications marked as read" };
  }
}
