import { CreateTemplateDto, UpdateTemplateDto } from "@/decorators";
import { sendSuccessResponse } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { TemplatesService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

// This class will handle the routes for templates
export class TemplatesController {
  private static instance: TemplatesController;

  private readonly templatesService: TemplatesService;

  private constructor() {
    this.templatesService = TemplatesService.getInstance();
  }

  static getInstance(): TemplatesController {
    if (!TemplatesController.instance) {
      TemplatesController.instance = new TemplatesController();
    }
    return TemplatesController.instance;
  }

  createTemplate = async (
    req: GenericReq<CreateTemplateDto>,
    res: Response
  ) => {
    const data = await this.templatesService.createEmailTemplate(
      req.authData!,
      req.body
    );
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  getUserTemplates = async (req: Request, res: Response) => {
    const data = await this.templatesService.getUserTemplates(
      req.authData!,
      req.query
    );
    return sendSuccessResponse(res, data);
  };

  updateTemplate = async (
    req: GenericReq<UpdateTemplateDto>,
    res: Response
  ) => {
    const data = await this.templatesService.updateTemplate(
      req.authData!,
      req.params.id,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  deleteTemplate = async (req: Request, res: Response) => {
    const data = await this.templatesService.deleteTemplate(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };
}
