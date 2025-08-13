import {
  CreateReminderDto,
  SendInstantReminderDto,
  UpdateReminderDto,
} from "@/decorators";
import { ReminderTypes } from "@/enums";
import { sendSuccessResponse, throwBadRequestError } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { EnhancedReminderService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";

export class ReminderController {
  private static instance: ReminderController;
  private readonly reminderService: EnhancedReminderService;

  constructor() {
    this.reminderService = EnhancedReminderService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ReminderController();
    }
    return this.instance;
  }

  // Send instant reminder
  sendInstantReminder = async (
    req: GenericReq<SendInstantReminderDto>,
    res: Response
  ) => {
    const { body, authData } = req;

    // Validate that at least one contact method is provided
    const hasEmail = body.email || (body.emails && body.emails.length > 0);
    const hasPhone = body.phone || (body.phones && body.phones.length > 0);

    if (!hasEmail && !hasPhone) {
      return throwBadRequestError(
        "At least one email or phone number must be provided"
      );
    }

    if (body.templateId && !Types.ObjectId.isValid(body.templateId)) {
      return throwBadRequestError("Invalid template id");
    }

    const reminder = await this.reminderService.sendInstantReminder({
      userId: authData!.userId,
      fileId: Boolean(body.fileId) ? body.fileId : undefined,
      tag: body.tag,
      message: body.message,
      subject: body.subject,
      channel: body.channel,
      category: body.category,
      email: body.email || undefined,
      phone: body.phone || undefined,
      emails: body.emails || (body.email ? [body.email] : undefined),
      phones: body.phones || (body.phone ? [body.phone] : undefined),
      isBulk: body.isBulk,
      template: body.template,
      templateId: Boolean(body.templateId) ? body.templateId : undefined,
      templateData: body.templateData,
    });

    return sendSuccessResponse(
      res,
      {
        reminder,
        message: "Instant reminder sent successfully",
      },
      StatusCodes.CREATED
    );
  };

  // Create scheduled, recurring, or event-based reminder
  createReminder = async (
    req: GenericReq<CreateReminderDto>,
    res: Response
  ) => {
    const { body, authData } = req;

    // Validate that at least one contact method is provided
    const hasEmail = body.email || (body.emails && body.emails.length > 0);
    const hasPhone = body.phone || (body.phones && body.phones.length > 0);

    if (!hasEmail && !hasPhone) {
      return throwBadRequestError(
        "At least one email or phone number must be provided"
      );
    }

    if (body.templateId && !Types.ObjectId.isValid(body.templateId)) {
      return throwBadRequestError("Invalid template id");
    }

    let data;

    switch (body.type) {
      case ReminderTypes.SCHEDULED:
        if (!body.remindAt) {
          return throwBadRequestError(
            "Remind at date is required for scheduled reminders"
          );
        }
        data = await this.reminderService.scheduleReminder({
          userId: authData!.userId,
          fileId: Boolean(body.fileId) ? body.fileId : undefined,
          tag: body.tag,
          message: body.message,
          subject: body.subject,
          channel: body.channel,
          category: body.category,
          email: body.email || undefined,
          phone: body.phone || undefined,
          remindAt: new Date(body.remindAt),
          emails: body.emails || (body.email ? [body.email] : undefined),
          phones: body.phones || (body.phone ? [body.phone] : undefined),
          isBulk: body.isBulk,
          template: body.template,
          templateId: Boolean(body.templateId) ? body.templateId : undefined,
          templateData: body.templateData,
          timezone: body.timezone,
        });
        break;

      case ReminderTypes.RECURRING:
        if (!body.recurrencePattern || !body.startDate) {
          return throwBadRequestError(
            "Recurrence pattern and start date are required for recurring reminders"
          );
        }
        data = await this.reminderService.createRecurringReminder({
          userId: authData.userId,
          fileId: Boolean(body.fileId) ? body.fileId : undefined,
          tag: body.tag,
          message: body.message,
          subject: body.subject,
          channel: body.channel,
          category: body.category,
          recurrencePattern: body.recurrencePattern,
          recurrenceInterval: body.recurrenceInterval,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          maxExecutions: body.maxExecutions,
          email: body.email || undefined,
          phone: body.phone || undefined,
          emails: body.emails || (body.email ? [body.email] : undefined),
          phones: body.phones || (body.phone ? [body.phone] : undefined),
          isBulk: body.isBulk,
          template: body.template,
          templateId: Boolean(body.templateId) ? body.templateId : undefined,
          templateData: body.templateData,
          timezone: body.timezone,
          customCronExpression: body.customCronExpression,
        });
        break;

      case ReminderTypes.EVENT_BASED:
        if (
          !body.eventDate ||
          body.eventTrigger === undefined ||
          body.triggerOffset === undefined
        ) {
          return throwBadRequestError(
            "Event date, event trigger, and trigger offset are required for event-based reminders"
          );
        }
        data = await this.reminderService.createEventBasedReminder({
          userId: authData.userId,
          fileId: Boolean(body.fileId) ? body.fileId : undefined,
          tag: body.tag,
          message: body.message,
          subject: body.subject,
          channel: body.channel,
          category: body.category,
          eventDate: new Date(body.eventDate),
          eventTrigger: body.eventTrigger,
          triggerOffset: body.triggerOffset,
          email: body.email || undefined,
          phone: body.phone || undefined,
          emails: body.emails || (body.email ? [body.email] : undefined),
          phones: body.phones || (body.phone ? [body.phone] : undefined),
          isBulk: body.isBulk,
          template: body.template,
          templateId: Boolean(body.templateId) ? body.templateId : undefined,
          templateData: body.templateData,
          timezone: body.timezone,
        });
        break;

      default:
        return throwBadRequestError("Unsupported reminder type");
    }

    return sendSuccessResponse(
      res,
      {
        ...data,
        message: "Reminder created successfully",
      },
      StatusCodes.CREATED
    );
  };

  // Update reminder
  updateReminder = async (
    req: GenericReq<UpdateReminderDto>,
    res: Response
  ) => {
    const { body, authData, params } = req;

    const data = await this.reminderService.updateReminder(
      authData.userId,
      params.id,
      body
    );

    return sendSuccessResponse(res, {
      ...data,
      message: "Reminder updated successfully",
    });
  };

  // Get all reminders for authenticated user
  getReminders = async (req: Request, res: Response) => {
    const { authData, query } = req;

    // Extract pagination parameters
    const page = query.page ? parseInt(query.page as string) : 1;
    const limit = query.limit ? parseInt(query.limit as string) : 20;
    const sortBy = (query.sortBy as string) || "createdAt";
    const sortOrder = (query.sortOrder as "asc" | "desc") || "desc";

    // Extract filter parameters
    const filters: any = {};
    if (query.status) filters.status = query.status;
    if (query.type) filters.type = query.type;
    if (query.channel) filters.channel = query.channel;
    if (query.tag) filters.tag = query.tag as string;
    if (query.isActive !== undefined)
      filters.isActive = query.isActive === "true";
    if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom as string);
    if (query.dateTo) filters.dateTo = new Date(query.dateTo as string);

    const data = await this.reminderService.getReminders(
      authData.userId,
      filters,
      { page, limit, sortBy, sortOrder }
    );

    return sendSuccessResponse(res, data);
  };

  // Get reminder by ID
  getReminderById = async (req: Request, res: Response) => {
    const { authData, params } = req;

    const reminder = await this.reminderService.getReminderById(
      authData.userId,
      params.id
    );

    return sendSuccessResponse(res, { reminder });
  };

  // Pause/deactivate reminder
  pauseReminder = async (req: Request, res: Response) => {
    const { authData, params } = req;

    const data = await this.reminderService.pauseReminder(authData, params.id);

    return sendSuccessResponse(res, data);
  };

  // Resume/activate reminder
  resumeReminder = async (req: Request, res: Response) => {
    const { authData, params } = req;

    const data = await this.reminderService.resumeReminder(authData, params.id);

    return sendSuccessResponse(res, data);
  };

  // Cancel reminder
  cancelReminder = async (req: Request, res: Response) => {
    const { authData, params } = req;

    const data = await this.reminderService.cancelReminder(
      authData.userId,
      params.id
    );

    return sendSuccessResponse(res, data);
  };

  // Delete reminder (hard delete)
  deleteReminder = async (req: Request, res: Response) => {
    const { authData, params } = req;

    const data = await this.reminderService.deleteReminder(
      authData.userId,
      params.id
    );

    return sendSuccessResponse(res, data);
  };

  // Get reminder analytics
  getReminderAnalytics = async (req: Request, res: Response) => {
    const { authData } = req;

    const data = await this.reminderService.getReminderAnalytics(
      authData.userId
    );

    return sendSuccessResponse(res, { data });
  };

  // Cleanup completed reminders
  cleanupReminders = async (req: Request, res: Response) => {
    const { query } = req;
    const olderThanDays = query.days ? parseInt(query.days as string) : 30;

    await this.reminderService.cleanupCompletedReminders(olderThanDays);

    return sendSuccessResponse(res, {
      message: `Cleaned up completed reminders older than ${olderThanDays} days`,
    });
  };
}
