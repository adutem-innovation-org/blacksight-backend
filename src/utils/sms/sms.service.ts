// Enhanced interface with better validation options
export interface ISmsOptions {
  body?: string;
  template?: string;
  locals?: Record<string, string | number>;
  to: string;
  source?: "file" | "text" | "body";
  from?: string; // Allow override of sender
  statusCallback?: string; // Webhook URL for delivery status
  maxPrice?: string; // Maximum price for message
  validityPeriod?: number; // Message validity period in seconds
}

export interface ISmsResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  messageId?: string;
}

// Enhanced base SMS service with better type safety
export abstract class SmsService<SmsResponse> {
  protected readonly sender: string;

  constructor(sender: string) {
    if (!sender?.trim()) {
      throw new Error("Sender phone number is required");
    }
    this.sender = sender;
  }

  abstract send(options: ISmsOptions): Promise<ISmsResult<SmsResponse>>;
  abstract render(options: ISmsOptions): Promise<string>;

  // Utility method for phone number validation
  protected validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Utility method for input sanitization
  protected sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[\r\n\t]/g, " ")
      .replace(/\s+/g, " ");
  }
}
