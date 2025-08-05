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

// Add permissive CORS for all agent routes
agentRouter.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
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
