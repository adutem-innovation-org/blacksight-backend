import { config } from "@/config";
import { OAuth2Client, TokenPayload } from "google-auth-library";

export class GoogleAuth {
  client = new OAuth2Client(config.google);

  /**
   *
   * @param idToken - access token from frontend
   */
  async fetchTokenInfo(idToken: string): Promise<TokenPayload | undefined> {
    const ticket = await this.client.verifyIdToken({
      idToken: idToken,
      audience: config.google,
    });
    return ticket.getPayload();
  }
}
