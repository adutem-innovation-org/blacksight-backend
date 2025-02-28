import Email from "email-templates";
import { IEmailOptions, MailResponse, MailService } from "../mail.service";
import { config } from "@/config";
import { createTransport } from "nodemailer";
import mg from "nodemailer-mailgun-transport";
import { logger } from "@/logging";
import Handlebars from "handlebars";

export class MailgunEmailService extends MailService {
  mailService: Email;
  private static instance: MailgunEmailService;

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
}
