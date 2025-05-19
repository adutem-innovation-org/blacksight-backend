import { config } from "@/config";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import axios from "axios";
export class GoogleAuth {
  client = new OAuth2Client(config.google);

  /**
   * Verify an id token
   * @param idToken - access token from frontend
   */
  async fetchTokenInfo(idToken: string): Promise<TokenPayload | undefined> {
    const ticket = await this.client.verifyIdToken({
      idToken: idToken,
      audience: config.google.clientId,
    });
    return ticket.getPayload();
  }

  async validateAccessToken(accessToken: string): Promise<any> {
    const response = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
    );
    return response?.data;
  }
}
