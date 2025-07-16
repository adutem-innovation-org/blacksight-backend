import { CreateSettingsDto, UpdateSettingsDto } from "@/decorators";
import { sendSuccessResponse } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { SettingsService } from "@/services";
import { Request, Response } from "express";

export class SettingsController {
  private static instance: SettingsController;

  private readonly settingsService: SettingsService;

  constructor() {
    this.settingsService = SettingsService.getInstance();
  }

  static getInstance(): SettingsController {
    if (!this.instance) {
      this.instance = new SettingsController();
    }
    return this.instance;
  }

  createSettings = async (
    req: GenericReq<CreateSettingsDto>,
    res: Response
  ) => {
    const data = await this.settingsService.createSettings(req.body);
    return sendSuccessResponse(res, data);
  };

  getSettings = async (req: Request, res: Response) => {
    const data = await this.settingsService.findAll();
    return sendSuccessResponse(res, data);
  };

  updateSettings = async (
    req: GenericReq<UpdateSettingsDto>,
    res: Response
  ) => {
    const data = await this.settingsService.updateSettings(req.body);
    return sendSuccessResponse(res, data);
  };
}
