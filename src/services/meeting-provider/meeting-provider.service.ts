import { MeetingProvidersEnum } from "@/enums";
import { AuthData } from "@/interfaces";
import { MeetingProvider, IMeetingProvider, IUser, User } from "@/models";
import { Model, Types } from "mongoose";
import { GoogleCalenderService } from "./providers";

export class MeetingProviderService {
  private static instance: MeetingProviderService;
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

    await this.meetingProviderModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        provider: MeetingProvidersEnum.GOOGLE,
      },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: new Date(
          tokens.expiry_date ?? this.getSevenDaysFromNow()
        ).getTime(),
        userId,
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
