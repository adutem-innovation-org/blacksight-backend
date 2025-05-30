import { ReminderController } from "@/controllers";
import { CreateReminderDto, UpdateReminderDto } from "@/decorators";
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

reminderRouter.use(validateToken);

reminderRouter.get("/analytics", reminderController.reminderAnalytics);

reminderRouter.post(
  "/create",
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
  permissionRequirement([UserTypes.USER]),
  reminderController.getReminders
);

reminderRouter.get(
  "/:id",
  permissionRequirement([UserTypes.USER]),
  reminderController.getReminderById
);

reminderRouter.patch(
  "/update/:id",
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
  permissionRequirement([UserTypes.USER]),
  validateDTO(UpdateReminderDto),
  reminderController.updateReminder
);

reminderRouter.patch("/activate/:id", reminderController.activateReminder);
reminderRouter.patch("/deactivate/:id", reminderController.deactivateReminder);

reminderRouter.delete(
  "/delete/:id",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  reminderController.deleteReminder
);
