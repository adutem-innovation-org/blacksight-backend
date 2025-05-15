import { bookingProviderUrlMapper } from "@/constants";
import { AddBookingProviderDto } from "@/decorators";
import { MeetingProviders } from "@/enums";
import { AuthData } from "@/interfaces";
import { MeetingProvider, IMeetingProvider } from "@/models";
import { Model, Types } from "mongoose";

export class MeetingProviderService {
  private static instance: MeetingProviderService;
  private readonly meetingProviderModel: Model<IMeetingProvider> =
    MeetingProvider;

  constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new MeetingProviderService();
    }
    return this.instance;
  }

  async connectGoogle(auth: AuthData) {}

  async connectGoogleCallback(auth: AuthData) {}

  async connectZoom(auth: AuthData) {}

  async connectZoomCallback(auth: AuthData) {}

  async addProvider(auth: AuthData, body: AddBookingProviderDto) {
    const bookingUrl = bookingProviderUrlMapper[body.provider];
    const provider = await this.meetingProviderModel.create({
      provider: body.provider,
      bookingUrl,
      userId: auth.userId,
      apiKey: body.apiKey,
    });
  }
}
