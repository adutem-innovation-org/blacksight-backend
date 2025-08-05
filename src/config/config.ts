import dotenv from "dotenv";
import path from "path";
import { logger } from "@/logging";
import ms, { StringValue } from "ms";
import { CurrencyEnum } from "@/enums";

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
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl: process.env.GOOGLE_CALENDAR_CONSENT_REDIRECT_URL,
  },
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
  ipapi: {
    apiKey: process.env.IPAPI_API_KEY ?? "",
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    virtualNumber: process.env.TWILIO_VIRTUAL_NUMBER ?? "",
  },
  firebase: {
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    storage: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    },
  },
  isProduction: process.env.ENVIRONMENT === "production",
  encryption: {
    apiKey: process.env.API_KEY_ENCRYPTION_KEY!,
  },
  settings: {
    costPerRU: Number.parseFloat(process.env.COST_PER_RU!),
    currency: process.env.CURRENCY! || CurrencyEnum.DOLLAR,
    costPerToken: Number.parseFloat(process.env.COST_PER_TOKEN!),
    costPerWU: Number.parseFloat(process.env.COST_PER_WU!),
    markUpPercent: Number.parseFloat(process.env.MARK_UP_PERCENT!),
    costPerStorageGB: Number.parseFloat(process.env.COST_PER_STORAGE_GB!),
    storageMarkUpPercent: Number.parseFloat(
      process.env.STORAGE_MARK_UP_PERCENT!
    ),
    tokenConversionFactor: Number.parseFloat(
      process.env.TOKEN_CONVERSION_FACTOR!
    ),
    costPerPromptToken: Number.parseFloat(process.env.COST_PER_PROMPT_TOKEN!),
    costPerCachedPromptToken: Number.parseFloat(
      process.env.COST_PER_CACHED_PROMPT_TOKEN!
    ),
    costPerCompletionToken: Number.parseFloat(
      process.env.COST_PER_COMPLETION_TOKEN!
    ),
    chatCompletionMarkUpPercent: Number.parseFloat(
      process.env.CHAT_COMPLETION_MARK_UP_PERCENT!
    ),
    costPerEmbeddingToken: Number.parseFloat(
      process.env.COST_PER_EMBEDDING_TOKEN!
    ),
    embeddingsMarkUpPercent: Number.parseFloat(
      process.env.EMBEDDINGS_MARK_UP_PERCENT!
    ),
    costPerTranscriptionMinute: Number.parseFloat(
      process.env.COST_PER_TRANSCRIPTION_MINUTE!
    ),
    transcriptionMarkUpPercent: Number.parseFloat(
      process.env.TRANSCRIPTION_MARK_UP_PERCENT!
    ),
  },
  scraping: {
    timeout: 30000,
    maxContentLength: 1_000_000,
    // userAgent: "ContentBot/1.0 (+https://blacksight.co)",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.129 Safari/537.36",
  },
};
