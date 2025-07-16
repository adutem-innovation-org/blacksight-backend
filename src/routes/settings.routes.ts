import { SettingsController } from "@/controllers";
import { CreateSettingsDto } from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  adminAccess,
  permissionRequirement,
  validateDTO,
  validateToken,
} from "@/middlewares";

export const settingsRouter = createRouter();
const settingsController = SettingsController.getInstance();

settingsRouter.use(
  validateToken,
  permissionRequirement([UserTypes.ADMIN]),
  adminAccess(true)
);

settingsRouter.post(
  "/create",
  validateDTO(CreateSettingsDto),
  settingsController.createSettings
);

settingsRouter.get("/", settingsController.getSettings);

settingsRouter.patch(
  "/update",
  validateDTO(CreateSettingsDto),
  settingsController.updateSettings
);
