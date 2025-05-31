import { sendSuccessResponse } from "@/helpers";
import { NotificationService } from "@/services";
import { Request, Response } from "express";

export class NotificationController {
  private static instance: NotificationController;

  private readonly notificationService: NotificationService;

  constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationController();
    }
    return this.instance;
  }

  getAllNotifications = async (req: Request, res: Response) => {
    const data = await this.notificationService.getAllNotifications(
      req.authData!,
      Number(req.query.page ?? "1")
    );
    return sendSuccessResponse(res, data);
  };

  markAllNoficationsAsRead = async (req: Request, res: Response) => {
    const data = await this.notificationService.markAllAsRead(req.authData!);
    return sendSuccessResponse(res, data);
  };
}
