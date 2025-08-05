import twilio, { Twilio } from "twilio";
import { config } from "@/config";
import path from "path";
import fs from "fs/promises";
import { MessageInstance } from "twilio/lib/rest/api/v2010/account/message";
import { ISmsOptions, ISmsResult, SmsService } from "../sms.service";

export class TwilioMessagingService extends SmsService<MessageInstance> {
  private static instance: TwilioMessagingService;
  private readonly twilioClient: Twilio;
  private readonly templateCache = new Map<string, string>();
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second

  constructor(sender: string = config.twilio.virtualNumber ?? "") {
    super(sender);

    // Validate Twilio configuration
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      throw new Error("Twilio credentials are required");
    }

    this.twilioClient = twilio(
      config.twilio.accountSid,
      config.twilio.authToken
    );
  }

  static getInstance(): TwilioMessagingService {
    if (!this.instance) {
      this.instance = new TwilioMessagingService();
    }
    return this.instance;
  }

  async send(options: ISmsOptions): Promise<ISmsResult<MessageInstance>> {
    try {
      // Validate required fields
      if (!options.to?.trim()) {
        return { success: false, error: "Recipient phone number is required" };
      }

      if (!this.validatePhoneNumber(options.to)) {
        return {
          success: false,
          error: "Invalid recipient phone number format",
        };
      }

      // Render message body
      const body = await this.render(options);

      if (!body) {
        return { success: false, error: "Message body cannot be empty" };
      }

      // Validate message length (Twilio SMS limit is 1600 characters)
      if (body.length > 1600) {
        return {
          success: false,
          error: `Message too long: ${body.length} characters (max: 1600)`,
        };
      }

      // Prepare message options
      const messageOptions: any = {
        body: this.sanitizeInput(body),
        from: options.from || this.sender,
        to: options.to,
      };

      // Add optional parameters
      if (options.statusCallback)
        messageOptions.statusCallback = options.statusCallback;
      if (options.maxPrice) messageOptions.maxPrice = options.maxPrice;
      if (options.validityPeriod)
        messageOptions.validityPeriod = options.validityPeriod;

      // Send with retry logic
      const message = await this.sendWithRetry(messageOptions);

      return {
        success: true,
        data: message,
        messageId: message.sid,
      };
    } catch (error: any) {
      console.error("SMS send failed:", error);
      return {
        success: false,
        error: error.message || "Failed to send SMS",
      };
    }
  }

  private async sendWithRetry(
    messageOptions: any,
    attempt: number = 1
  ): Promise<MessageInstance> {
    try {
      return await this.twilioClient.messages.create(messageOptions);
    } catch (error: any) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        console.warn(
          `SMS send attempt ${attempt} failed, retrying...`,
          error.message
        );
        await this.delay(this.retryDelay * attempt);
        return this.sendWithRetry(messageOptions, attempt + 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on temporary network errors, rate limits, etc.
    const retryableCodes = [20429, 20003, 21211]; // Rate limit, timeout, network error
    return (
      retryableCodes.includes(error.code) ||
      error.status >= 500 ||
      error.message?.includes("timeout")
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async render(options: ISmsOptions): Promise<string> {
    try {
      let templateContent = "";

      // Determine source priority: body > template with source > template file
      if (options.body?.trim()) {
        templateContent = options.body;
      } else if (options.template?.trim()) {
        templateContent = await this.getTemplateContent(options);
      } else {
        throw new Error(
          "No message content provided (body or template required)"
        );
      }

      // Validate template content
      if (!templateContent.trim()) {
        throw new Error("Template content is empty");
      }

      // Render template with locals
      return this.renderTemplate(templateContent, options.locals || {});
    } catch (error: any) {
      console.error("Template rendering failed:", error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  private async getTemplateContent(options: ISmsOptions): Promise<string> {
    if (!options.template) {
      throw new Error("Template name is required");
    }

    const source = options.source || "file";

    if (source === "text") {
      return options.template;
    }

    if (source === "file") {
      // Check cache first
      const cacheKey = options.template;
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey)!;
      }

      // Construct and validate template path
      const templatePath = path.resolve(
        __dirname,
        `../../../sms/templates/${options.template}.txt`
      );

      // Security check: ensure template path is within allowed directory
      const allowedDir = path.resolve(__dirname, "../../../sms/templates/");
      if (!templatePath.startsWith(allowedDir)) {
        throw new Error("Invalid template path");
      }

      try {
        await fs.access(templatePath, fs.constants.R_OK);
        const content = await fs.readFile(templatePath, "utf8");

        // Cache the template content
        this.templateCache.set(cacheKey, content);

        return content;
      } catch (error: any) {
        if (error.code === "ENOENT") {
          throw new Error(`Template file not found: ${options.template}`);
        }
        throw new Error(`Failed to read template: ${error.message}`);
      }
    }

    throw new Error(`Invalid template source: ${source}`);
  }

  private renderTemplate(
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

  // Additional utility methods
  async getMessageStatus(
    messageSid: string
  ): Promise<ISmsResult<MessageInstance>> {
    try {
      const message = await this.twilioClient.messages(messageSid).fetch();
      return { success: true, data: message };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getAccountBalance(): Promise<ISmsResult<any>> {
    try {
      const balance = await this.twilioClient.balance.fetch();
      return { success: true, data: balance };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Clear template cache (useful for development/testing)
  clearTemplateCache(): void {
    this.templateCache.clear();
  }

  // Validate message before sending (useful for testing)
  async validateMessage(
    options: ISmsOptions
  ): Promise<ISmsResult<{ body: string; length: number }>> {
    try {
      const body = await this.render(options);

      if (!body) {
        return { success: false, error: "Message body is empty" };
      }

      if (body.length > 1600) {
        return {
          success: false,
          error: `Message too long: ${body.length} characters (max: 1600)`,
        };
      }

      return {
        success: true,
        data: { body, length: body.length },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
