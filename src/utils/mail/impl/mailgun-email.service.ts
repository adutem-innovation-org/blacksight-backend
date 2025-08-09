import Email from "email-templates";
import {
  IEmailMessage,
  IEmailOptions,
  IExternalEmailOptions,
  MailResponse,
  MailService,
} from "../mail.service";
import { config } from "@/config";
import { createTransport } from "nodemailer";
import mg from "nodemailer-mailgun-transport";
import { logger } from "@/logging";
import Handlebars from "handlebars";
import { EmailTemplate, IEmailTemplate } from "@/models";
import { Logger } from "winston";
import { Model } from "mongoose";

export class MailgunEmailService extends MailService {
  mailService: Email;
  private static instance: MailgunEmailService;
  private static logger: Logger = logger;

  private readonly emailTemplateModel: Model<IEmailTemplate> = EmailTemplate;

  constructor(sender: string = `no-reply@${config.mail.domain}`) {
    super(sender);

    this.mailService = new Email({
      message: {
        from: sender,
      },
      views: {
        root: "src/emails",
        options: {
          extension: "hbs",
          engineSource: {
            hbs: Handlebars,
          },
        },
      },
      send: config.env !== "development",
      preview: config.env === "development",
      transport: createTransport(
        mg({
          auth: {
            api_key: config.mail.apiKey || "",
            domain: config.mail.domain || "",
          },
        })
      ),
      subjectPrefix: `[${config.env}] `,
    });
  }

  /**
   * Gets or create an instance of the mailgun email service
   * @returns {MailgunEmailService}
   */
  static getInstance(): MailgunEmailService {
    if (!this.instance) {
      this.instance = new MailgunEmailService();
    }
    return this.instance;
  }

  async send(options: IEmailOptions): Promise<MailResponse> {
    try {
      const data = await this.mailService.send({
        ...options,
        locals: options.locals,
      });
      return { data };
    } catch (error: any) {
      logger.log(error);
      return { error };
    }
  }

  async sendExternalEmailWithTemplate({
    message,
    template,
    locals,
  }: {
    message: IEmailMessage;
    template: IEmailTemplate;
    locals?: any;
  }): Promise<MailResponse> {
    try {
      // Render with the provided template
      const compiledTemplate = Handlebars.compile(template.html);
      const renderedHtml = compiledTemplate(locals || {});

      const data = await this.mailService.send({
        message: {
          ...message,
          html: renderedHtml,
        },
        template: undefined,
        locals: {},
      });

      return { data };
    } catch (error: any) {
      MailgunEmailService.logger.error(`External email send failed: ${error}`);
      return { error };
    }
  }

  async sendEmailWithMongodbTemplate(
    options: IExternalEmailOptions
  ): Promise<MailResponse> {
    try {
      // Fetch the template from database
      const template = await this.emailTemplateModel.findById(
        options.templateId
      );

      if (!template) {
        return { error: `Template with ID ${options.templateId} not found` };
      }

      // Render the template with handlebars (or your template engine)
      const compiledTemplate = Handlebars.compile(template.html);
      const renderedHtml = compiledTemplate(options.locals || {});

      // Send the email using nodemailer transport
      const data = await this.mailService.send({
        message: {
          ...options.message,
          html: renderedHtml,
        },
        template: undefined, // We're providing raw HTML
        locals: {}, // Already rendered
      });
      return { data };
    } catch (error) {
      MailgunEmailService.logger.error(`External email send failed: ${error}`);
      return { error };
    }
  }

  async sendEmailWithMessageText(options: {
    message: Omit<IEmailMessage, "text">;
    text: string;
    locals?: any;
  }): Promise<MailResponse> {
    try {
      // Send the email using nodemailer transport
      const data = await this.mailService.send({
        message: {
          ...options.message,
          text: this.renderTextTemplate(options.text, options.locals || {}), // Rendered text options.text,
        },
        template: undefined, // We're providing raw HTML
        locals: {}, // Already rendered
      });
      return { data };
    } catch (error) {
      MailgunEmailService.logger.error(`External email send failed: ${error}`);
      return { error };
    }
  }

  async render(options: IEmailOptions): Promise<MailResponse> {
    try {
      const data = await this.mailService.render(options.template, {
        locals: options.locals,
      });
      return { data };
    } catch (error: any) {
      logger.error(`${error}`);
      return { error };
    }
  }

  private renderTextTemplate(
    template: string,
    locals: Record<string, string | number>
  ): string {
    let result = template;

    // More robust template variable replacement
    Object.entries(locals).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      result = result.replace(regex, String(value));
    });

    // Check for unresolved template variables
    const unresolvedVars = result.match(/{{\s*\w+\s*}}/g);
    if (unresolvedVars) {
      console.warn("Unresolved template variables found:", unresolvedVars);
    }

    return result.trim();
  }
}
