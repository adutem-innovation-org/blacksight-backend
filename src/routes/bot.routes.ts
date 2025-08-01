import { WHISPERAI_AUDIO_MIMETYPES } from "@/constants";
import { BotController } from "@/controllers";
import {
  AskChatbotDto,
  ConfigureBotDto,
  EscalateChatDto,
  ScheduleAppointmentDto,
  StartConversationDto,
  TranscribeChatAudioDto,
  UpdateBotConfigurationDto,
  UpdateBotInstructionsDto,
} from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  uploadSingleFile,
  validateDTO,
  validateToken,
} from "@/middlewares";

export const botRouter = createRouter();
const botController = BotController.getInstance();

botRouter.use(validateToken);

botRouter.patch(
  "/update/all",
  permissionRequirement([UserTypes.ADMIN]),
  botController.updateAllBots
);

botRouter.get("/analytics", botController.botAnalytics);

botRouter.get("/conversation/analytics", botController.conversationAnalytics);

botRouter.get(
  "/all",
  permissionRequirement([UserTypes.USER, UserTypes.ADMIN]),
  botController.getBots
);

botRouter.get(
  "/conversation/all",
  permissionRequirement([UserTypes.USER, UserTypes.ADMIN]),
  botController.getAllConversations
);

botRouter.post(
  "/configure",
  permissionRequirement([UserTypes.USER]),
  validateDTO(ConfigureBotDto),
  botController.configureBot
);

botRouter.post(
  "/clone/:id",
  permissionRequirement([UserTypes.USER]),
  botController.cloneBot
);

botRouter
  .route("/:id")
  .get(botController.getBotById)
  .patch(
    permissionRequirement([UserTypes.USER]),
    validateDTO(UpdateBotConfigurationDto),
    botController.updateBotConfiguration
  );

botRouter.delete(
  "/delete/:id",
  permissionRequirement([UserTypes.USER]),
  botController.deleteBot
);

botRouter.patch("/deactivate/:id", botController.deactivateBot);
botRouter.patch("/activate/:id", botController.activateBot);

botRouter.patch(
  "/instructions/:id",
  permissionRequirement([UserTypes.USER]),
  validateDTO(UpdateBotInstructionsDto),
  botController.updateBotInstructions
);

botRouter.post(
  "/conversation/training/start",
  validateDTO(StartConversationDto),
  botController.startConversation
);

botRouter.post(
  "/conversation/training/ask-chatbot",
  validateDTO(AskChatbotDto),
  botController.askChatbot
);

botRouter.get(
  "/conversation/training/:botId",
  botController.getTrainingConversation
);

botRouter.delete(
  "/conversation/training/:botId/:conversationId",
  botController.clearTrainingConversation
);

botRouter.post(
  "/conversation/training/speech-to-text",
  uploadSingleFile({
    name: "speech-file",
    mimeTypes: WHISPERAI_AUDIO_MIMETYPES,
    required: true,
    configs: {
      dest: "uploads/",
    },
  }),
  validateDTO(TranscribeChatAudioDto),
  botController.speechToText
);

botRouter.post(
  "/conversation/training/schedule-appointment",
  validateDTO(ScheduleAppointmentDto),
  botController.scheduleAppointment
);

botRouter.post(
  "/conversation/training/escalate-chat",
  validateDTO(EscalateChatDto),
  botController.escalateChat
);
