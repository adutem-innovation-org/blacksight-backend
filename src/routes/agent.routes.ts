import { WHISPERAI_AUDIO_MIMETYPES } from "@/constants";
import { AgentController } from "@/controllers";
import { AskAgentDto, BookingRequestDto, SubmitTicketDto } from "@/decorators";
import { createRouter } from "@/helpers";
import {
  extractSessionId,
  uploadSingleFile,
  validateDTO,
  verifyApiKey,
} from "@/middlewares";
import cors from "cors";
import { NextFunction, Request, Response } from "express";

export const agentRouter = createRouter();
const agentController = AgentController.getInstance();

// Add this before your other middleware in agentRouter
agentRouter.use((req: any, res: any, next: any) => {
  console.log("Got here");
  // Set CORS headers manually
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

// Handle preflight requests first
agentRouter.options(
  "*",
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-api-key",
      "x-agent-id",
      "x-session-id",
    ],
  })
);

// Apply CORS to all routes
agentRouter.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-api-key",
      "x-agent-id",
      "x-session-id",
    ],
  })
);

agentRouter.use(verifyApiKey, extractSessionId);

agentRouter.get("/connect", agentController.connect);

agentRouter.post("/ask", validateDTO(AskAgentDto), agentController.ask);

agentRouter.post(
  "/transcribe-speech",
  uploadSingleFile({
    name: "speech-file",
    mimeTypes: WHISPERAI_AUDIO_MIMETYPES,
    required: true,
    configs: {
      dest: "uploads/",
    },
  }),
  agentController.transcribeSpeech
);

agentRouter.post(
  "/book-appointment",
  validateDTO(BookingRequestDto),
  agentController.bookAppointment
);

agentRouter.post(
  "/submit-ticket",
  validateDTO(SubmitTicketDto),
  agentController.submitTicket
);
