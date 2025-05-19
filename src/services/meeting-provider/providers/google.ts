import { config } from "@/config";
import { Credentials, OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

export class GoogleCalenderService {
  private readonly oauth2Client: OAuth2Client;
  private static instance: GoogleCalenderService;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      redirectUri: config.google.redirectUrl,
    });
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new GoogleCalenderService();
    }
    return this.instance;
  }

  generateGoogleAuthUrl(userId: string) {
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
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

  setGoogleClientCredentials(tokens: Credentials) {
    this.oauth2Client.setCredentials(tokens);
  }
}
