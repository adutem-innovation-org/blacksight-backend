// Enhanced Reminder Service
import { logger } from "@/logging";
import {
  TwilioMessagingService,
  MailgunEmailService,
  MailResponse,
} from "@/utils";
import cron from "node-cron";
import moment from "moment-timezone";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { Model, Types } from "mongoose";
import {
  BusinessCustomerPayment,
  EmailTemplate,
  IBusinessCustomerPayment,
  IEmailTemplate,
  IReminder,
  Reminder,
} from "@/models";
import {
  EventTrigger,
  QueueEnums,
  QueueJobs,
  RecurrencePattern,
  ReminderCategory,
  ReminderChannels,
  ReminderStatus,
  ReminderTypes,
} from "@/enums";
import { config } from "@/config";
import { ReminderProcessor, ReminderQueueEvents } from "./reminder.processor";
import { throwBadRequestError, throwNotFoundError } from "@/helpers";
import {
  PaginationOptions,
  ReminderAnalytics,
  ReminderFilters,
} from "@/interfaces";

export class EnhancedReminderService {
  private static instance: EnhancedReminderService;

  private readonly reminderModel: Model<IReminder> = Reminder;
  private readonly emailTemplateModel: Model<IEmailTemplate> = EmailTemplate;
  private readonly bcpModel: Model<IBusinessCustomerPayment> =
    BusinessCustomerPayment;
  private readonly smsService: TwilioMessagingService;
  private readonly emailService: MailgunEmailService;

  // Queue for processing reminders
  private readonly reminderQueue: Queue;

  // Cron job for checking pending reminders
  private cronJob: any;

  constructor() {
    this.smsService = TwilioMessagingService.getInstance();
    this.emailService = MailgunEmailService.getInstance();

    // Initialize Redis queue
    this.reminderQueue = new Queue(QueueEnums.REMINDER_PROCESSING, {
      connection: config.redis,
      prefix: config.env?.toLowerCase() ?? "unspecified_env",
    });

    this.setupQueueProcessor();
    this.startCronJob();
  }

  static getInstance(): EnhancedReminderService {
    if (!this.instance) {
      this.instance = new EnhancedReminderService();
    }
    return this.instance;
  }

  // 1. Instant Reminders
  async sendInstantReminder(data: {
    userId: string;
    fileId?: string;
    tag: string;
    message: string;
    subject?: string;
    email?: string;
    phone?: string;
    emails?: string[];
    phones?: string[];
    channel: ReminderChannels;
    category: ReminderCategory;
    isBulk?: boolean;
    template?: string;
    templateId?: string;
    templateData?: Record<string, any>;
  }) {
    const reminder = await this.reminderModel.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
      type: ReminderTypes.INSTANT,
      isBulk: Boolean(
        data?.isBulk || data.emails?.length || data.phones?.length
      ),
      status: ReminderStatus.PENDING,
      nextExecution: new Date(),
    });

    // Queue for immediate processing
    await this.reminderQueue.add(
      QueueJobs.PROCESS_REMINDER,
      {
        reminderId: reminder._id.toString(),
      },
      {
        priority: 10, // High priority for instant
        attempts: 3,
        backoff: { type: "exponential" },
      }
    );

    return reminder;
  }

  // 2. Scheduled Reminders
  async scheduleReminder(data: {
    userId: string;
    fileId?: string;
    tag: string;
    message: string;
    subject?: string;
    email?: string;
    phone?: string;
    emails?: string[];
    phones?: string[];
    channel: ReminderChannels;
    category: ReminderCategory;
    isBulk?: boolean;
    remindAt: Date;
    template?: string;
    templateId?: string;
    templateData?: Record<string, any>;
    timezone?: string;
  }) {
    const reminder = await this.reminderModel.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
      type: ReminderTypes.SCHEDULED,
      isBulk: Boolean(
        data?.isBulk || data.emails?.length || data.phones?.length
      ),
      status: ReminderStatus.PENDING,
      nextExecution: data.remindAt,
    });

    // Calculate delay and queue
    const delay = data.remindAt.getTime() - Date.now();
    if (delay > 0) {
      await this.reminderQueue.add(
        QueueJobs.PROCESS_REMINDER,
        {
          reminderId: reminder._id.toString(),
        },
        {
          delay,
          attempts: 3,
          backoff: { type: "exponential" },
        }
      );
    }

    return reminder;
  }

  // 3. Recurring Reminders
  async createRecurringReminder(data: {
    userId: string;
    fileId?: string;
    tag: string;
    message: string;
    subject?: string;
    email?: string;
    phone?: string;
    emails?: string[];
    phones?: string[];
    channel: ReminderChannels;
    category: ReminderCategory;
    isBulk?: boolean;
    recurrencePattern: RecurrencePattern;
    recurrenceInterval?: number;
    startDate: Date;
    endDate?: Date;
    maxExecutions?: number;
    template?: string;
    templateId?: string;
    templateData?: Record<string, any>;
    timezone?: string;
    customCronExpression?: string;
  }) {
    const nextExecution = this.calculateNextExecution(
      data.startDate,
      data.recurrencePattern,
      data.recurrenceInterval,
      data.timezone,
      data.customCronExpression
    );

    const reminder = await this.reminderModel.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
      type: ReminderTypes.RECURRING,
      isBulk: Boolean(
        data?.isBulk || data.emails?.length || data.phones?.length
      ),
      status: ReminderStatus.PENDING,
      nextExecution,
      recurrenceEnd: data.endDate,
    });

    return reminder;
  }

  // 4. Event-based Reminders
  async createEventBasedReminder(data: {
    userId: string;
    fileId?: string;
    tag: string;
    message: string;
    subject?: string;
    email?: string;
    phone?: string;
    emails?: string[];
    phones?: string[];
    channel: ReminderChannels;
    category: ReminderCategory;
    isBulk?: boolean;
    eventDate: Date;
    eventTrigger: EventTrigger;
    triggerOffset: number; // minutes
    template?: string;
    templateId?: string;
    templateData?: Record<string, any>;
    timezone?: string;
  }) {
    let nextExecution: Date;

    switch (data.eventTrigger) {
      case EventTrigger.BEFORE:
        nextExecution = new Date(
          data.eventDate.getTime() - data.triggerOffset * 60000
        );
        break;
      case EventTrigger.AFTER:
        nextExecution = new Date(
          data.eventDate.getTime() + data.triggerOffset * 60000
        );
        break;
      case EventTrigger.ON:
        nextExecution = data.eventDate;
        break;
      default:
        nextExecution = data.eventDate;
    }

    const reminder = await this.reminderModel.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
      type: ReminderTypes.EVENT_BASED,
      isBulk: Boolean(
        data?.isBulk || data.emails?.length || data.phones?.length
      ),
      status: ReminderStatus.PENDING,
      nextExecution,
    });

    return reminder;
  }

  // Get reminders with filtering and pagination
  async getReminders(
    userId: string,
    filters: ReminderFilters = {},
    pagination: PaginationOptions = {}
  ) {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;

    // Build filter query
    const query: any = { userId: new Types.ObjectId(userId) };

    if (filters.status) {
      query.status = Array.isArray(filters.status)
        ? { $in: filters.status }
        : filters.status;
    }

    if (filters.type) {
      query.type = Array.isArray(filters.type)
        ? { $in: filters.type }
        : filters.type;
    }

    if (filters.channel) {
      query.channel = Array.isArray(filters.channel)
        ? { $in: filters.channel }
        : filters.channel;
    }

    if (filters.tag) {
      query.tag = { $regex: filters.tag, $options: "i" };
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [data, total] = await Promise.all([
      this.reminderModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reminderModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
        prev: page > 1,
        next: page * limit < total,
      },
    };
  }

  // Get single reminder by ID
  async getReminderById(userId: string, reminderId: string) {
    const reminder = await this.reminderModel
      .findOne({
        _id: new Types.ObjectId(reminderId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!reminder) {
      throwNotFoundError("Reminder not found");
    }

    return reminder;
  }

  // Update reminder
  async updateReminder(
    userId: string,
    reminderId: string,
    updateData: Partial<{
      tag: string;
      message: string;
      subject: string;
      channel: ReminderChannels;
      emails: string[];
      phones: string[];
      remindAt: Date;
      recurrencePattern: RecurrencePattern;
      recurrenceInterval: number;
      startDate: Date;
      endDate: Date;
      maxExecutions: number;
      customCronExpression: string;
      eventDate: Date;
      eventTrigger: EventTrigger;
      triggerOffset: number;
      template: string;
      templateData: Record<string, any>;
      timezone: string;
      priority: number;
      maxRetries: number;
      isActive: boolean;
      nextExecution: Date;
      isBulk: boolean;
    }>
  ) {
    const reminder = await this.reminderModel.findOne({
      _id: new Types.ObjectId(reminderId),
      userId: new Types.ObjectId(userId),
    });

    if (!reminder) {
      return throwNotFoundError("Reminder not found");
    }

    // Don't allow updating completed or cancelled reminders
    if (
      [
        ReminderStatus.SENT,
        ReminderStatus.COMPLETED,
        ReminderStatus.CANCELLED,
      ].includes(reminder.status)
    ) {
      throwBadRequestError(
        "Cannot update completed, sent, or cancelled reminders"
      );
    }

    // Handle date/time updates for recurring reminders
    if (updateData.startDate && reminder.type === ReminderTypes.RECURRING) {
      const nextExecution = this.calculateNextExecution(
        updateData.startDate,
        updateData.recurrencePattern || reminder.recurrencePattern!,
        updateData.recurrenceInterval || reminder.recurrenceInterval,
        updateData.timezone || reminder.timezone,
        updateData.customCronExpression || reminder.customCronExpression
      );
      updateData.nextExecution = nextExecution;
    }

    // Handle scheduled reminder time updates
    if (updateData.remindAt && reminder.type === ReminderTypes.SCHEDULED) {
      updateData.nextExecution = updateData.remindAt;
    }

    // Handle event-based reminder updates
    if (reminder.type === ReminderTypes.EVENT_BASED) {
      if (
        updateData.eventDate ||
        updateData.eventTrigger !== undefined ||
        updateData.triggerOffset !== undefined
      ) {
        const eventDate = updateData.eventDate || reminder.eventDate!;
        const eventTrigger =
          updateData.eventTrigger !== undefined
            ? updateData.eventTrigger
            : reminder.eventTrigger!;
        const triggerOffset =
          updateData.triggerOffset !== undefined
            ? updateData.triggerOffset
            : reminder.triggerOffset!;

        let nextExecution: Date;
        switch (eventTrigger) {
          case EventTrigger.BEFORE:
            nextExecution = new Date(
              eventDate.getTime() - triggerOffset * 60000
            );
            break;
          case EventTrigger.AFTER:
            nextExecution = new Date(
              eventDate.getTime() + triggerOffset * 60000
            );
            break;
          case EventTrigger.ON:
            nextExecution = eventDate;
            break;
          default:
            nextExecution = eventDate;
        }
        updateData.nextExecution = nextExecution;
      }
    }

    // Update bulk status if emails/phones change
    if (updateData.emails || updateData.phones) {
      updateData.isBulk = Boolean(
        updateData.emails?.length || updateData.phones?.length
      );
    }

    Object.assign(reminder, updateData);
    await reminder.save();

    return reminder;
  }

  // Delete reminder (hard delete)
  async deleteReminder(userId: string, reminderId: string) {
    const reminder = await this.reminderModel.findOne({
      _id: new Types.ObjectId(reminderId),
      userId: new Types.ObjectId(userId),
    });

    if (!reminder) {
      throwNotFoundError("Reminder not found");
    }

    await this.reminderModel.findByIdAndDelete(reminderId);

    return { message: "Reminder deleted successfully" };
  }

  // Get reminder analytics
  async getReminderAnalytics(userId: string): Promise<ReminderAnalytics> {
    const userObjectId = new Types.ObjectId(userId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate analytics data
    const [totalStats, typeStats, channelStats, statusStats, recentActivity] =
      await Promise.all([
        // Total counts
        this.reminderModel.aggregate([
          { $match: { userId: userObjectId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: ["$isActive", 1, 0] } },
              completed: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        "$status",
                        [ReminderStatus.SENT, ReminderStatus.COMPLETED],
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              failed: {
                $sum: {
                  $cond: [{ $eq: ["$status", ReminderStatus.FAILED] }, 1, 0],
                },
              },
              totalSuccess: { $sum: "$successCount" },
              totalFailure: { $sum: "$failureCount" },
            },
          },
        ]),

        // By type
        this.reminderModel.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),

        // By channel
        this.reminderModel.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: "$channel", count: { $sum: 1 } } },
        ]),

        // By status
        this.reminderModel.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),

        // Recent activity (last 30 days)
        this.reminderModel.aggregate([
          {
            $match: {
              userId: userObjectId,
              lastExecution: { $gte: thirtyDaysAgo },
            },
          },
          {
            $group: {
              _id: null,
              sent: { $sum: "$successCount" },
              failed: { $sum: "$failureCount" },
            },
          },
        ]),
      ]);

    // Process results
    const totals = totalStats[0] || {
      total: 0,
      active: 0,
      completed: 0,
      failed: 0,
      totalSuccess: 0,
      totalFailure: 0,
    };

    const byType: Record<ReminderTypes, number> = Object.values(
      ReminderTypes
    ).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<ReminderTypes, number>);

    typeStats.forEach((stat) => {
      byType[stat._id as ReminderTypes] = stat.count;
    });

    const byChannel: Record<ReminderChannels, number> = Object.values(
      ReminderChannels
    ).reduce((acc, channel) => {
      acc[channel] = 0;
      return acc;
    }, {} as Record<ReminderChannels, number>);

    channelStats.forEach((stat) => {
      byChannel[stat._id as ReminderChannels] = stat.count;
    });

    const byStatus: Record<ReminderStatus, number> = Object.values(
      ReminderStatus
    ).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<ReminderStatus, number>);

    statusStats.forEach((stat) => {
      byStatus[stat._id as ReminderStatus] = stat.count;
    });

    const recentActivityData = recentActivity[0] || { sent: 0, failed: 0 };

    const successRate =
      totals.totalSuccess + totals.totalFailure > 0
        ? (totals.totalSuccess / (totals.totalSuccess + totals.totalFailure)) *
          100
        : 0;

    return {
      total: totals.total,
      active: totals.active,
      completed: totals.completed,
      failed: totals.failed,
      byType,
      byChannel,
      byStatus,
      successRate: Math.round(successRate * 100) / 100,
      recentActivity: {
        sent: recentActivityData.sent,
        failed: recentActivityData.failed,
        period: "Last 30 days",
      },
    };
  }

  // Queue Processing
  private setupQueueProcessor() {
    // Process reminders
    ReminderProcessor.getInstance(
      QueueEnums.REMINDER_PROCESSING,
      async (job: Job) => {
        const { reminderId } = job.data;
        await this.processReminder(reminderId);
      }
    );

    // Global event listener
    ReminderQueueEvents.getInstance(QueueEnums.REMINDER_PROCESSING);
  }

  // Cron Job for Scheduled Checks
  private startCronJob() {
    // Run every minute to check for pending reminders
    this.cronJob = cron.createTask("* * * * *", async () => {
      await this.checkPendingReminders();
    });

    this.cronJob.start();
  }

  private async checkPendingReminders() {
    const now = new Date();
    const pendingReminders = await this.reminderModel
      .find({
        status: ReminderStatus.PENDING,
        isActive: true,
        nextExecution: { $lte: now },
      })
      .limit(100); // Process in batches

    for (const reminder of pendingReminders) {
      await this.reminderQueue.add(
        QueueJobs.PROCESS_REMINDER,
        {
          reminderId: reminder._id.toString(),
        },
        {
          priority: reminder.priority || 5,
          attempts: reminder.maxRetries || 3,
          backoff: { type: "exponential" },
        }
      );
    }
  }

  // Core Processing Logic
  private async processReminder(reminderId: string) {
    const reminder = await this.reminderModel.findOne({
      _id: new Types.ObjectId(reminderId),
      isActive: true,
      status: ReminderStatus.PENDING,
    });

    if (!reminder || !reminder.isActive) return;

    try {
      let success = false;

      // Send via appropriate channel
      if (
        reminder.channel === ReminderChannels.EMAIL ||
        reminder.channel === ReminderChannels.BOTH
      ) {
        success = await this.sendEmailReminder(reminder);
      }

      if (
        reminder.channel === ReminderChannels.SMS ||
        reminder.channel === ReminderChannels.BOTH
      ) {
        const smsSuccess = await this.sendSmsReminder(reminder);
        success = success || smsSuccess;
      }

      // Update reminder status
      reminder.lastExecution = new Date();
      reminder.executionCount += 1;

      if (success) {
        reminder.successCount += 1;
        reminder.retryCount = 0;
      } else {
        reminder.failureCount += 1;
        reminder.retryCount! += 1;
      }

      // Handle recurring reminders
      if (reminder.type === ReminderTypes.RECURRING && success) {
        const nextExecution = this.calculateNextExecution(
          reminder.nextExecution!,
          reminder.recurrencePattern!,
          reminder.recurrenceInterval,
          reminder.timezone,
          reminder.customCronExpression
        );

        if (this.shouldContinueRecurrence(reminder, nextExecution)) {
          reminder.nextExecution = nextExecution;
          reminder.status = ReminderStatus.PENDING;
        } else {
          reminder.status = ReminderStatus.COMPLETED;
          reminder.isActive = false;
        }
      } else if (reminder.type !== ReminderTypes.RECURRING) {
        reminder.status = success ? ReminderStatus.SENT : ReminderStatus.FAILED;
        reminder.isActive = success
          ? false
          : reminder.retryCount! < (reminder.maxRetries || 3);
        if (!success && reminder.retryCount! >= (reminder.maxRetries || 3)) {
          reminder.isActive = false;
        }
      }

      await reminder.save();
    } catch (error: any) {
      logger.error("Error processing reminder:", error);
      reminder.lastError = error.message;
      reminder.failureCount += 1;
      reminder.retryCount! += 1;

      if (reminder.retryCount! >= (reminder.maxRetries || 3)) {
        reminder.status = ReminderStatus.FAILED;
        reminder.isActive = false;
      }

      await reminder.save();
    }
  }

  private async sendEmailReminder(reminder: IReminder): Promise<boolean> {
    try {
      const recipients = reminder.isBulk
        ? reminder.emails || []
        : [reminder.email!];

      // Fetch external templates ONCE before looping if needed
      // Could use caching in the future
      let template = null;
      if (reminder.templateId) {
        template = await this.emailTemplateModel.findById(reminder.templateId);
        if (!template) {
          logger.error(
            `Template ${reminder.templateId} not found for reminder ${reminder._id}`
          );
          return false;
        }
      }

      let hasFailures = false;

      for (const email of recipients) {
        try {
          const query: Record<string, any> = {
            email,
            userId: new Types.ObjectId(reminder.userId),
          };

          if (
            reminder?.fileId &&
            reminder.category === ReminderCategory.PAYMENT
          ) {
            query["fileId"] = new Types.ObjectId(reminder.fileId);
          }

          // Fetch email data
          const customerData = await this.bcpModel.findOne(query);
          if (!customerData) {
            logger.error(`Customer data not found for email ${email}`);
            hasFailures = true;
            continue;
          }

          let updatedData = {
            ...(reminder.templateData ?? {}),
            customerName: customerData.name.split(" ")[0],
            customerEmail: customerData.email,
            customerPhone: customerData?.phone,
            lastPayment: new Date(customerData.lastPayment).toLocaleString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              }
            ),
            nextPayment: new Date(customerData.nextPayment).toLocaleString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              }
            ),
            paymentInterval: customerData.paymentInterval,
          };

          let result: MailResponse | null = null;

          if (reminder.templateId && template) {
            result = await this.emailService.sendExternalEmailWithTemplate({
              message: {
                to: email,
                subject: reminder.subject || reminder.tag,
              },
              template,
              locals: updatedData,
            });
          } else if (reminder.template) {
            await this.emailService.send({
              message: {
                to: email,
                subject: reminder.subject || reminder.tag,
              },
              template: reminder.template!,
              locals: updatedData,
            });
          } else {
            result = await this.emailService.sendEmailWithMessageText({
              message: {
                to: email,
                subject: reminder.subject || reminder.tag,
              },
              text: reminder.message,
              locals: { ...updatedData, message: reminder.message },
            });
          }

          if (!result || result.error) {
            logger.error("Email send failed:", result?.error);
            hasFailures = true;
            continue;
          }
        } catch (emailError: any) {
          logger.error(
            `Failed to process email ${email}: ${JSON.stringify(
              emailError,
              null,
              2
            )}`
          );
          hasFailures = true;
        }
      }

      return true;
    } catch (error) {
      logger.error("Email reminder failed:", error);
      return false;
    }
  }

  private async sendSmsReminder(reminder: IReminder): Promise<boolean> {
    try {
      const recipients = reminder.isBulk
        ? reminder.phones || []
        : [reminder.phone!];

      for (const phone of recipients) {
        const result = await this.smsService.send({
          to: phone,
          body: reminder.message,
          template: reminder.template,
          locals: reminder.templateData,
        });

        if (!result.success) {
          logger.error("SMS send failed:", result.error);
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error("SMS reminder failed:", error);
      return false;
    }
  }

  // Utility methods for recurrence calculation
  private calculateNextExecution(
    currentDate: Date,
    pattern: RecurrencePattern,
    interval?: number,
    timezone?: string,
    customCron?: string
  ): Date {
    const tz = timezone || "UTC";
    const current = moment.tz(currentDate, tz);
    const now = moment.tz(tz);

    // If the start date is still in the future, use it as the first execution
    if (current.isAfter(now)) {
      return current.toDate();
    }

    if (customCron) {
      // Use cron-parser for custom expressions
      const parser = require("cron-parser");
      const cronInterval = parser.parseExpression(customCron, { tz });
      return cronInterval.next().toDate();
    }

    switch (pattern) {
      case RecurrencePattern.DAILY:
        return current.add(interval || 1, "days").toDate();

      case RecurrencePattern.WEEKLY:
        return current.add(interval || 1, "weeks").toDate();

      case RecurrencePattern.MONTHLY:
        return current.add(interval || 1, "months").toDate();

      case RecurrencePattern.YEARLY:
        return current.add(interval || 1, "years").toDate();

      case RecurrencePattern.WEEKDAYS:
        do {
          current.add(1, "day");
        } while (current.day() === 0 || current.day() === 6); // Skip weekends
        return current.toDate();

      case RecurrencePattern.WEEKENDS:
        do {
          current.add(1, "day");
        } while (current.day() !== 0 && current.day() !== 6); // Only weekends
        return current.toDate();

      case RecurrencePattern.FIRST_DAY_OF_MONTH:
        return current.add(1, "month").startOf("month").toDate();

      case RecurrencePattern.LAST_DAY_OF_MONTH:
        return current.add(1, "month").endOf("month").toDate();

      case RecurrencePattern.FIRST_MONDAY_OF_MONTH:
        const nextMonth = current.add(1, "month").startOf("month");
        while (nextMonth.day() !== 1) nextMonth.add(1, "day");
        return nextMonth.toDate();

      case RecurrencePattern.EVERY_N_DAYS:
        return current.add(interval || 1, "days").toDate();

      case RecurrencePattern.EVERY_N_WEEKS:
        return current.add(interval || 1, "weeks").toDate();

      case RecurrencePattern.EVERY_N_MONTHS:
        return current.add(interval || 1, "months").toDate();

      default:
        return current.add(1, "day").toDate();
    }
  }

  private shouldContinueRecurrence(
    reminder: IReminder,
    nextExecution: Date
  ): boolean {
    // Check end date
    if (reminder.recurrenceEnd && nextExecution > reminder.recurrenceEnd) {
      return false;
    }

    // Check max executions
    if (
      reminder.maxExecutions &&
      reminder.executionCount >= reminder.maxExecutions
    ) {
      return false;
    }

    return true;
  }

  // Management methods
  async pauseReminder(reminderId: string) {
    await this.reminderModel.findByIdAndUpdate(reminderId, { isActive: false });
  }

  async resumeReminder(reminderId: string) {
    await this.reminderModel.findByIdAndUpdate(reminderId, { isActive: true });
  }

  async cancelReminder(reminderId: string) {
    await this.reminderModel.findByIdAndUpdate(reminderId, {
      status: ReminderStatus.CANCELLED,
      isActive: false,
    });
  }

  // Cleanup methods
  async cleanupCompletedReminders(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await this.reminderModel.deleteMany({
      status: { $in: [ReminderStatus.SENT, ReminderStatus.COMPLETED] },
      updatedAt: { $lt: cutoffDate },
    });
  }

  // Graceful shutdown
  async shutdown() {
    if (this.cronJob) {
      this.cronJob.destroy();
    }
    await this.reminderQueue.close();
  }
}
