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

export const agentRouter = createRouter();
const agentController = AgentController.getInstance();

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
