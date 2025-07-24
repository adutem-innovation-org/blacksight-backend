import { CreateTemplateDto, UpdateTemplateDto } from "@/decorators";
import { throwNotFoundError } from "@/helpers";
import { AuthData } from "@/interfaces";
import { EmailTemplate, IEmailTemplate } from "@/models";
import { PaginationService } from "@/utils";
import { Model, Types } from "mongoose";

export class TemplatesService {
  private static instance: TemplatesService;

  private readonly emailTemplateModel: Model<IEmailTemplate> = EmailTemplate;

  private readonly templatesPagination: PaginationService<IEmailTemplate>;

  // Define methods and properties for the TemplateService
  constructor() {
    // Initialization code here
    this.templatesPagination = new PaginationService<IEmailTemplate>(
      this.emailTemplateModel
    );
  }

  static getInstance(): TemplatesService {
    if (!TemplatesService.instance) {
      TemplatesService.instance = new TemplatesService();
    }
    return TemplatesService.instance;
  }

  /**
   * Creates a new email template
   * @param authData The authentication data from the authenticated user
   * @param body The template data
   * @returns The newly created template
   */
  async createEmailTemplate(authData: AuthData, body: CreateTemplateDto) {
    const template = await this.emailTemplateModel.create({
      ...body,
      createdBy: authData.userId,
    });

    return { template, message: "Template created successfully" };
  }

  async getUserTemplates(authData: AuthData, query: any) {
    const queryObj: Record<string, unknown> = {
      createdBy: new Types.ObjectId(authData.userId),
    };

    if (query.category) {
      queryObj["category"] = query.category;
    }

    if (query.niches) {
      queryObj["niches"] = { $in: query.niches };
    }

    const templates = await this.templatesPagination.paginate(
      {
        query: queryObj,
        projections: [
          "name",
          "description",
          "type",
          "category",
          "preview",
          "dynamicFields",
          "niches",
          "createdAt",
          "updatedAt",
        ],
        sort: "-createdAt",
      },
      []
    );

    return templates;
  }

  async updateTemplate(
    authData: AuthData,
    id: string,
    body: UpdateTemplateDto
  ): Promise<{ template: IEmailTemplate; message: string }> {
    const template = await this.emailTemplateModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        createdBy: new Types.ObjectId(authData.userId),
      },
      body,
      { new: true }
    );

    if (!template) return throwNotFoundError("Template not found");

    return { template, message: "Template updated successfully" };
  }

  async deleteTemplate(
    authData: AuthData,
    id: string
  ): Promise<{ template: IEmailTemplate; message: string }> {
    const template = await this.emailTemplateModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      createdBy: new Types.ObjectId(authData.userId),
    });
    if (!template) return throwNotFoundError("Template not found");
    return { template, message: "Template deleted successfully" };
  }
}
