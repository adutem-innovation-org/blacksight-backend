import { CreateReminderDto, UpdateReminderDto } from "@/decorators";
import { sendSuccessResponse } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { ReminderService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export class ReminderController {
  private static instance: ReminderController;
  private readonly reminderService: ReminderService;

  constructor() {
    this.reminderService = ReminderService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ReminderController();
    }
    return this.instance;
  }

  reminderAnalytics = async (req: Request, res: Response) => {
    const data = await this.reminderService.reminderAnalytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  createReminder = async (
    req: GenericReq<CreateReminderDto>,
    res: Response
  ) => {
    const data = await this.reminderService.createReminder(
      req.authData!,
      req.body
    );
    return sendSuccessResponse(
      res,
      {
        ...data,
        message: "Reminder set successfully",
      },
      StatusCodes.CREATED
    );
  };

  updateReminder = async (
    req: GenericReq<UpdateReminderDto>,
    res: Response
  ) => {
    const data = await this.reminderService.updateReminder(
      req.authData!,
      req.params.id,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  getReminders = async (req: Request, res: Response) => {
    const data = await this.reminderService.getReminders(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getReminderById = async (req: Request, res: Response) => {
    const data = await this.reminderService.getReminderById(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  activateReminder = async (req: Request, res: Response) => {
    const data = await this.reminderService.activateReminder(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  deactivateReminder = async (req: Request, res: Response) => {
    const data = await this.reminderService.deactivateReminder(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  deleteReminder = async (req: Request, res: Response) => {
    const data = await this.reminderService.deleteReminder(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };
}
