import { config } from "@/config";
import { MeetingProvidersEnum } from "@/enums";
import { IMeetingProvider } from "@/models";
import axios from "axios";
import { throwServerError } from "./throw-request-error";
import qs from "qs";

export async function refreshTokenIfNeeded(provider: IMeetingProvider) {
  const now = Date.now();

  if (new Date(provider.expiryDate).getTime() - now > 60000) {
    return provider.accessToken; // still valid
  }

  let newTokens;
  switch (provider.provider) {
    case MeetingProvidersEnum.GOOGLE:
      newTokens = await refreshGoogleToken(provider.refreshToken);
      break;
    case MeetingProvidersEnum.ZOOM:
      newTokens = await refreshZoomToken(provider.refreshToken);
      break;
    case MeetingProvidersEnum.MICROSOFT:
      newTokens = await refreshTeamsToken(provider.refreshToken);
      break;
    default:
      throwServerError("Unsupported Provider");
  }

  provider.accessToken = newTokens.access_token;
  provider.expiryDate = new Date(now + newTokens.expires_in * 1000);

  await provider.save();

  return provider.accessToken;
}

// Provider-specific token refresh
async function refreshGoogleToken(refreshToken: string) {
  const res = await axios.post(
    "https://oauth2.googleapis.com/token",
    qs.stringify({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  console.log(res.data);
  return res.data;
}

async function refreshZoomToken(refreshToken: string) {
  //   const credentials = Buffer.from(
  //     `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  //   ).toString("base64");
  //   const res = await axios.post("https://zoom.us/oauth/token", null, {
  //     params: { grant_type: "refresh_token", refresh_token: refreshToken },
  //     headers: { Authorization: `Basic ${credentials}` },
  //   });
  //   return res.data;
}

async function refreshTeamsToken(refreshToken: string) {
  //   const res = await axios.post(
  //     `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
  //     new URLSearchParams({
  //       client_id: process.env.MS_CLIENT_ID,
  //       client_secret: process.env.MS_CLIENT_SECRET,
  //       refresh_token: refreshToken,
  //       grant_type: "refresh_token",
  //       scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
  //     }),
  //     { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  //   );
  //   return res.data;
}

module.exports = { refreshTokenIfNeeded };
