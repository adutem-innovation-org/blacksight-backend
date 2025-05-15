import dotenv from "dotenv";
import path from "path";
import { logger } from "@/logging";
import ms, { StringValue } from "ms";

// Get current node environment
const env = process.env.NODE_ENV || "development";

// Configure env
const envFileName = `.env.${env}`;

const envPath = path.resolve(process.cwd(), envFileName).trim();

// Try loading the environment variables and check if there's an error
const result = dotenv.config({ path: envPath });

if (result.error) {
  logger.error("Error loading .env file:", result.error);
} else {
  logger.debug("Successfully loaded .env file:", envPath);
}

export const config = {
  port: Number.parseInt(process.env.PORT!) || 3000,
  env: process.env.ENV,
  google: process.env.GOOGLE_CLIENT_ID,
  hostname: process.env.HOST,
  baseUrl: process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT}`,
  corsOrigins: (process.env.CORS_ORIGINS || "").split(","),
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY!,
    publicKey: process.env.JWT_PUBLIC_KEY!,
    expiresIn: ms(
      Number.parseInt(process.env.JWT_TTL || "86400000")
    ) as StringValue,
    ttl: Number.parseInt(process.env.JWT_TTL || "86400000"),
    issuer: process.env.ISSUER || "blacksight-inc", // time in seconds
  },
  db: {
    url: process.env.DATABASE_URL,
  },
  mail: {
    apiKey: process.env.MAIL_API_KEY,
    domain: process.env.MAIL_DOMAIN,
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY ?? "",
    env: process.env.PINECONE_ENV,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
  },
  isProduction: process.env.ENVIRONMENT === "production",
};
