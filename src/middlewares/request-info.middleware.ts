import { config } from "@/config";
import { logJsonError } from "@/helpers";
import { IpData } from "@/interfaces";
import { logger } from "@/logging";
import axios from "axios";
import { NextFunction, Request, Response } from "express";
import useragent from "useragent";

export const getRequestInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const forwardedIp = (
    typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"]?.split(",")[0]
      : req.headers["x-forwarded-for"]?.[0]?.split(",")[0]
  )?.trim();

  // Courtesy of nginx
  const realIp =
    typeof req.headers["x-real-ip"] === "string"
      ? req.headers["x-real-ip"]?.split(",")[0]
      : req.headers["x-real-ip"]?.[0]?.split(",")[0];

  // Step 1: Get ip address
  const ip = forwardedIp || realIp || req.socket.remoteAddress || "";

  // Step 2: Parse user agent
  const agent = useragent.parse(req.headers["user-agent"]);

  // Step 3: Lookup geolocation
  let location: IpData | undefined;
  try {
    if (!ip) {
      location = { ip };
      return;
    }
    const { data } = (await axios.get(
      `https://api.ipapi.com/api/${ip}?access_key=${config.ipapi.apiKey}`
    )) as {
      data: {
        ip: string;
        city: string;
        region_name: string;
        country_name: string;
        latitude: number;
        longitude: number;
      };
    };
    location = {
      ip: data.ip || ip,
      city: data.city,
      region: data.region_name,
      country: data.country_name,
      lat: data.latitude,
      long: data.longitude,
    };
  } catch (error) {
    logger.error("Unable to lookup location");
    logJsonError(error);
    location = {
      ip,
    };
  }

  req.ipData = location;
  req.userAgent = {
    browser: agent.toAgent(),
    os: agent.os.toString(),
    platform: agent.device.toString(),
  };

  next();
};
