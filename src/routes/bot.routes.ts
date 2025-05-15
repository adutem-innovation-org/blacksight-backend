import { BotController } from "@/controllers";
import { ConfigureBotDto } from "@/decorators";
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
  .delete(permissionRequirement([UserTypes.USER]), botController.deleteBot);
