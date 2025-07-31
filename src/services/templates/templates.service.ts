import { CreateTemplateDto, UpdateTemplateDto } from "@/decorators";
import { TemplateCategory } from "@/enums";
import { isUser, throwNotFoundError } from "@/helpers";
import { AuthData } from "@/interfaces";
import { EmailTemplate, IEmailTemplate } from "@/models";
import { PaginationService } from "@/utils";
import { Model, Types } from "mongoose";
import puppeteer from "puppeteer";

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
   * Gets analytics data for templates
   * @param auth The authentication data from the authenticated user
   * @returns The analytics data
   */
  async analytics(auth: AuthData) {
    const queryObj: Record<string, any> = {};

    if (isUser(auth)) queryObj["createdBy"] = new Types.ObjectId(auth.userId);

    const result = await Promise.allSettled([
      this.emailTemplateModel.countDocuments(queryObj).exec(),
      this.emailTemplateModel
        .countDocuments({
          category: TemplateCategory.PAYMENT,
          ...queryObj,
        })
        .exec(),
      this.emailTemplateModel
        .countDocuments({
          category: TemplateCategory.APPOINTMENT,
          ...queryObj,
        })
        .exec(),
    ]);

    return {
      data: {
        totalTemplates: result[0].status === "fulfilled" ? result[0].value : 0,
        paymentTemplates:
          result[1].status === "fulfilled" ? result[1].value : 0,
        appointmentTemplates:
          result[2].status === "fulfilled" ? result[2].value : 0,
      },
    };
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

    if (query.keywords) {
      queryObj["keywords"] = { $in: query.keywords };
    }

    const templates = await this.templatesPagination.paginate(
      {
        query: queryObj,
        projections: [
          "name",
          "description",
          "type",
          "category",
          "html",
          "design",
          "preview",
          "dynamicFields",
          "keywords",
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

  async _generatePreview(html: string) {
    // Launch puppeteer
    const browser = await puppeteer.launch();
    try {
      // Open a new page
      const page = await browser.newPage();

      // Set the HTML content
      await page.setContent(html, { waitUntil: "networkidle0" });

      // Generate image
      const imageBuffer = await page.screenshot({
        fullPage: true,
      });

      await browser.close();
    } catch (e) {
      console.log("Error generating preview", e);
    } finally {
      await browser.close();
    }
  }
}
