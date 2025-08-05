import { config } from "@/config";
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
  // Step 1: Get ip address
  console.log(req.headers["x-forwarded-for"]);
  console.log(req.headers["x-real-ip"]);
  console.log(req.socket.remoteAddress);

  const ip =
    (req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"]?.split(",")[0]
      : req.headers["x-forwarded-for"]?.[0]?.split(",")[0]
    )?.trim() || req.socket.remoteAddress;

  // Step 2: Parse user agent
  const agent = useragent.parse(req.headers["user-agent"]);

  // Step 3: Lookup geolocation
  let location: IpData | undefined;
  try {
    const { data } = (await axios.get(
      `https://ipapi.com/api/${ip}?access_key=${config.ipapi.apiKey}`
    )) as {
      data: {
        ip: string;
        city: string;
        region_name: string;
        country_name: string;
        latitude: number;
        longtitude: number;
      };
    };
    location = {
      ip: data.ip || ip || "",
      city: data.city,
      region: data.region_name,
      country: data.country_name,
      lat: data.latitude,
      long: data.longtitude,
    };
  } catch (error) {
    logger.error("Unable to lookup location");
  }

  req.ipData = location;
  req.userAgent = {
    browser: agent.toAgent(),
    os: agent.os.toString(),
    platform: agent.device.toString(),
  };

  next();
};
