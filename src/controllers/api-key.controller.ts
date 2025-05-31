import { sendSuccessResponse } from "@/helpers";
import { ApiKeyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export class ApiKeyController {
  private static instance: ApiKeyController;

  private readonly apiKeyService: ApiKeyService;

  constructor() {
    this.apiKeyService = ApiKeyService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ApiKeyController();
    }
    return this.instance;
  }

  createApiKey = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.createApiKey(req.authData!);
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  resetApiKey = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.resetApiKey(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  getAllApiKeys = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.getAllApiKeys(
      req.authData!,
      Number(req.query.page ?? "1")
    );
    return sendSuccessResponse(res, data);
  };
}
