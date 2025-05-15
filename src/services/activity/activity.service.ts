import { ActivityEvents } from "@/events";
import { logger } from "@/logging";
import { Activity, IActivity } from "@/models";
import { ActivityTemplates } from "@/templates";
import { eventEmitter } from "@/utils";
import EventEmitter2 from "eventemitter2";
import { Model } from "mongoose";
import { Logger } from "winston";

export class ActivityService {
  private static instance: ActivityService;
  private readonly activityModel: Model<IActivity> = Activity;
  private readonly emitter: EventEmitter2 = eventEmitter;
  private readonly logger: Logger = logger;

  constructor() {
    this._setupEventListeners();
  }

  private _setupEventListeners() {
    this.emitter.on(ActivityEvents.USER_LOGIN, (payload) =>
      this._handleLoginEvent(payload)
    );
    this.emitter.on(ActivityEvents.USER_REGISTERED, (payload) =>
      this._handleRegisterEvent(payload)
    );
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ActivityService();
    }
    return this.instance;
  }

  private async _handleLoginEvent(payload: {
    firstName: string;
    lastName: string;
  }) {
    try {
      await this.activityModel.create({
        ...ActivityTemplates.userLoggedIn(payload),
      });
    } catch (error) {
      this.logger.error("Unable to log login activity");
    }
  }

  private async _handleRegisterEvent(payload: {
    firstName: string;
    lastName: string;
  }) {
    try {
      await this.activityModel.create({
        ...ActivityTemplates.userRegistered(payload),
      });
    } catch (error) {
      this.logger.error("Unable to log registeration activity");
    }
  }
}
