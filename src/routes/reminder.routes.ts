import { ReminderController } from "@/controllers";
import { CreateReminderDto } from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  uploadFiles,
  uploadSingleFile,
  validateDTO,
  validateToken,
} from "@/middlewares";
import { ReminderService } from "@/services";

export const reminderRouter = createRouter();
const reminderController = ReminderController.getInstance();

reminderRouter.get(
  "/analytics",
  validateToken,
  reminderController.reminderAnalytics
);

reminderRouter.post(
  "/create",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  uploadSingleFile({
    name: "file",
    mimeTypes: [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/json",
    ],
    configs: {
      dest: "uploads/",
    },
  }),
  ReminderService.middlewares.parseReminderFile,
  validateDTO(CreateReminderDto),
  reminderController.createReminder
);

reminderRouter.get(
  "/all",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  reminderController.getReminders
);

reminderRouter.get("/:id", validateToken, reminderController.getReminderById);

reminderRouter.delete(
  "/:id",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  reminderController.deleteReminder
);
