import { sendSuccessResponse } from "@/helpers";
import { AnalyticsService } from "@/services";
import { Request, Response } from "express";

export class AnalyticsController {
  private static instance: AnalyticsController;
  private readonly analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = AnalyticsService.getInstance();
  }

  static getInstance(): AnalyticsController {
    if (!this.instance) {
      this.instance = new AnalyticsController();
    }
    return this.instance;
  }

  getAdminAnalytics = async (req: Request, res: Response) => {
    const data = await this.analyticsService.getAdminAnalytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getBusinessAnalytics = async (req: Request, res: Response) => {
    const data = await this.analyticsService.getUserAnalytics(req.authData!);
    return sendSuccessResponse(res, data);
  };
}
