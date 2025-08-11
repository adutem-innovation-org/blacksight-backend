import { AddProductsSourceDto, AttachAgentDto } from "@/decorators";
import { KnowledgeBaseSources } from "@/enums";
import { sendSuccessResponse, throwBadRequestError } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { ProductRecommendationService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export class ProductRecommendationController {
  private static instance: ProductRecommendationController;

  private readonly productRecommendationService: ProductRecommendationService;

  constructor() {
    this.productRecommendationService =
      ProductRecommendationService.getInstance();
  }

  static getInstance(): ProductRecommendationController {
    if (!this.instance) {
      this.instance = new ProductRecommendationController();
    }
    return this.instance;
  }

  addProductsSource = async (
    req: GenericReq<AddProductsSourceDto>,
    res: Response
  ) => {
    if (!req.file && req.body.source === KnowledgeBaseSources.FILE)
      return throwBadRequestError("No file uploaded");
    const data = await this.productRecommendationService.addProductsSource(
      req.authData!,
      req.body,
      req.file!
    );
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  getAllProductsSources = async (req: Request, res: Response) => {
    const data = await this.productRecommendationService.getAllProductsSources(
      req.authData!
    );
    return sendSuccessResponse(res, data);
  };

  deleteProductsSource = async (req: Request, res: Response) => {
    const data = await this.productRecommendationService.deleteProductsSource(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  attachAgent = async (req: GenericReq<AttachAgentDto>, res: Response) => {
    const data = await this.productRecommendationService.attachAgent(
      req.authData!,
      req.params.id,
      req.body.agentId
    );
    return sendSuccessResponse(res, data);
  };

  detachAgent = async (req: GenericReq<AttachAgentDto>, res: Response) => {
    const data = await this.productRecommendationService.detachAgent(
      req.authData!,
      req.params.id,
      req.body.agentId
    );
    return sendSuccessResponse(res, data);
  };
}
