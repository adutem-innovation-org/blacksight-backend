import { EmailOptions } from "email-templates";

export interface IEmailMessage {
  from?: string;
  to: string;
  subject: string;
  headers?: Record<string, string>;
  text?: string;
  html?: string;
  attachments?: [];
}

export interface IEmailOptions extends EmailOptions {
  message: IEmailMessage;
  template: string;
}

export type MailResponse = {
  error?: any;
  data?: any;
};

export abstract class MailService {
  sender: string;

  constructor(sender: string) {
    this.sender = sender;
  }

  abstract send(options: EmailOptions): Promise<MailResponse>;

  abstract render(options: EmailOptions): Promise<MailResponse>;
}
