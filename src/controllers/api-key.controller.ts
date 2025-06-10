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

  regenerateApiKey = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.regenerateApiKey(
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

  getUserApiKey = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.getUserApiKey(req.authData!);
    return sendSuccessResponse(res, data);
  };

  revokeApiKey = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.revokeApiKey(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  reactivateApiKey = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.reactivateApiKey(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  activateApiKey = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.activateApiKey(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  deactivateApiKey = async (req: Request, res: Response) => {
    const data = await this.apiKeyService.deactivateApiKey(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };
}
