import { config } from "@/config";
import { CalendarProvidersEnum } from "@/enums";
import { ICalendarProvider, CalendarProvider } from "@/models";
import { addSeconds } from "date-fns";
import { Credentials, OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { Model } from "mongoose";

export class GoogleCalenderService {
  private readonly oauth2Client: OAuth2Client;
  private static instance: GoogleCalenderService;

  private readonly meetingProviderModel: Model<ICalendarProvider> =
    CalendarProvider;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      redirectUri: config.google.redirectUrl,
    });
    this._setupEventListener();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new GoogleCalenderService();
    }
    return this.instance;
  }

  private _setupEventListener() {
    this.oauth2Client.on("tokens", async (tokens) => {
      try {
        console.log("New token came in >> ", tokens);
        if (tokens.id_token) {
          const tokenPayload = await this.fetchTokenInfo(tokens.id_token);
          if (tokenPayload) {
            const expiration_time = addSeconds(new Date(), 60 * 60);
            await this.meetingProviderModel.findOneAndUpdate(
              { sub: tokenPayload.sub, provider: CalendarProvidersEnum.GOOGLE },
              {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                idToken: tokens.id_token,
                sub: tokenPayload.sub,
                expiryDate: new Date(
                  tokens.expiry_date ?? expiration_time
                ).getTime(),
                provider: CalendarProvidersEnum.GOOGLE,
              }
            );
          }
        }
      } catch (error) {
        console.log("Could not update provider token >> ", error);
      }
    });
  }

  getOauthClient() {
    return this.oauth2Client;
  }

  generateGoogleAuthUrl(userId: string) {
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "openid",
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: userId,
    });

    return authUrl;
  }

  async getGoogleTokens(authorizationCode: string) {
    const { tokens } = await this.oauth2Client.getToken(authorizationCode);
    return tokens;
  }

  async fetchTokenInfo(idToken: string) {
    const ticket = await this.oauth2Client.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    return ticket.getPayload();
  }

  setGoogleClientCredentials(tokens: Credentials) {
    this.oauth2Client.setCredentials(tokens);
  }
}
