import { MeetingProvidersEnum } from "@/enums";
import { AuthData } from "@/interfaces";
import {
  MeetingProvider,
  IMeetingProvider,
  IUser,
  User,
  IAppointment,
} from "@/models";
import { Model, Types } from "mongoose";
import { GoogleCalenderService } from "./providers";
import { refreshTokenIfNeeded, throwUnprocessableEntityError } from "@/helpers";
import { google } from "googleapis";
import { Logger } from "winston";
import { logger } from "@/logging";
import { v4 as uuidv4 } from "uuid";

export class MeetingProviderService {
  private static instance: MeetingProviderService;
  private static logger: Logger = logger;

  private readonly meetingProviderModel: Model<IMeetingProvider> =
    MeetingProvider;
  private readonly userModel: Model<IUser> = User;

  private readonly googleCalenderService: GoogleCalenderService;

  constructor() {
    this.googleCalenderService = GoogleCalenderService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new MeetingProviderService();
    }
    return this.instance;
  }

  async getMeetingProviders(auth: AuthData) {
    const providers = await this.meetingProviderModel.find({
      userId: new Types.ObjectId(auth.userId),
      accessToken: { $exists: true },
      refreshToken: { $exists: true },
    });
    return { providers };
  }

  async connectGoogle(auth: AuthData) {
    const url = this.googleCalenderService.generateGoogleAuthUrl(auth.userId);
    return url;
  }

  async connectGoogleCallback(userId: string, code: string) {
    const tokens = await this.googleCalenderService.getGoogleTokens(code);
    if (!tokens) {
      return `
        <script>
            window.opener.postMessage({provider: 'google-meet', success: false}, '*');
            window.close()
        </script>
        `;
    }

    const user = await this.userModel.findById(userId);
    if (!user)
      return `<script>
            window.opener.postMessage({provider: 'google-meet', success: false}, '*');
            window.close()
        </script>`;

    let tokenPayload;
    if (tokens.id_token)
      tokenPayload = await this.googleCalenderService.fetchTokenInfo(
        tokens.id_token
      );

    await this.meetingProviderModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        provider: MeetingProvidersEnum.GOOGLE,
      },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        sub: tokenPayload?.sub,
        expiryDate: new Date(
          tokens.expiry_date ?? this.getSevenDaysFromNow()
        ).getTime(),
        provider: MeetingProvidersEnum.GOOGLE,
      },
      { upsert: true }
    );

    await this.userModel.findByIdAndUpdate(userId, {
      hasConnectedGoogleMeet: true,
    });

    return `
        <script>
            window.opener.postMessage({provider: 'google-meet', success: true}, '*');
            window.close()
        </script>
        `;
  }

  async scheduleGoogleMeeting({
    provider,
    customerEmail,
    startTime,
    endTime,
    summary,
    timeZone = "America/Los_Angeles",
  }: {
    provider: IMeetingProvider;
    customerEmail: string;
    startTime: string;
    endTime: string;
    summary: string;
    timeZone?: string;
  }) {
    const oauthClient = this.googleCalenderService.getOauthClient();

    const accessToken = await refreshTokenIfNeeded(provider);

    oauthClient.setCredentials({
      access_token: accessToken,
      refresh_token: provider.refreshToken,
      expiry_date: new Date(provider.expiryDate).getTime(),
    });

    const calendar = google.calendar({ version: "v3", auth: oauthClient });

    const result = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      sendNotifications: true,
      requestBody: {
        summary,
        attendees: [{ email: customerEmail }],
        start: {
          dateTime: startTime,
          timeZone,
        },
        end: {
          dateTime: endTime,
          timeZone,
        },
        conferenceData: {
          createRequest: {
            requestId: uuidv4(), // must be unique per request
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    return {
      meetingLink: result.data.conferenceData?.entryPoints?.[0]?.uri,
      metadata: result.data as any,
    };

    MeetingProviderService.logger.info("Google meet event scheduled.");
  }

  async disconnectGoogle(auth: AuthData) {
    await this.meetingProviderModel.findOneAndUpdate(
      {
        provider: MeetingProvidersEnum.GOOGLE,
        userId: new Types.ObjectId(auth.userId),
      },
      { $unset: { accessToken: 1, refreshToken: 1, expiryDate: 1 } }
    );

    await this.userModel.findByIdAndUpdate(
      auth.userId,
      {
        hasConnectedGoogleMeet: false,
      },
      { new: true }
    );

    return { message: "Google calender has been disconnect successfully." };
  }

  async connectZoom(auth: AuthData) {}

  async connectZoomCallback(auth: AuthData) {}

  getSevenDaysFromNow() {
    return Date.now() + 1000 * 60 * 60 * 24 * 7;
  }
}
