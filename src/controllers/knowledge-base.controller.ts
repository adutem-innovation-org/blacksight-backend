import { AddKnowledgeBaseDto } from "@/decorators";
import { sendSuccessResponse, throwBadRequestError } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { KnowledgeBaseService } from "@/services";
import { Response, Request } from "express";
import { StatusCodes } from "http-status-codes";

export class KnowledgeBaseController {
  private static instance: KnowledgeBaseController;
  private readonly knowledgeBaseService: KnowledgeBaseService;

  constructor() {
    this.knowledgeBaseService = KnowledgeBaseService.getInstace();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new KnowledgeBaseController();
    }
    return this.instance;
  }

  knowledgeBaseAnaylytics = async (req: Request, res: Response) => {
    const data = await this.knowledgeBaseService.analytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  addKnowledgeBase = async (
    req: GenericReq<AddKnowledgeBaseDto>,
    res: Response
  ) => {
    if (!req.file) return throwBadRequestError("No file uploaded.");
    const data = await this.knowledgeBaseService.addKnowledgeBase(
      req.authData!,
      req.body,
      req.file!
    );
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  getAllKnowledgeBase = async (req: Request, res: Response) => {
    const data = await this.knowledgeBaseService.getAllKnowledgeBase(
      req.authData!
    );
    return sendSuccessResponse(res, data);
  };

  getKnowledgeBaseById = async (req: Request, res: Response) => {
    const data = await this.knowledgeBaseService.getKnowledgeBaseById(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  deleteKnowledgeBase = async (req: Request, res: Response) => {
    const data = await this.knowledgeBaseService.deleteKnowledgeBase(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };
}
