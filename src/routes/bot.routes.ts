import { BotController } from "@/controllers";
import {
  AskChatbotDto,
  ConfigureBotDto,
  StartConversationDto,
  UpdateBotConfigurationDto,
  UpdateBotInstructionsDto,
} from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
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

botRouter.get(
  "/all",
  permissionRequirement([UserTypes.USER, UserTypes.ADMIN]),
  botController.getBots
);

botRouter.post(
  "/configure",
  permissionRequirement([UserTypes.USER]),
  validateDTO(ConfigureBotDto),
  botController.configureBot
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
