import { CalendarController } from "@/controllers";
import { ConnectCalcomDto } from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  validateDTO,
  validateToken,
} from "@/middlewares";

export const calendarRouter = createRouter();
const calendarController = CalendarController.getInstance();

calendarRouter.get(
  "/connected",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  calendarController.getConnectedProviders
);

calendarRouter.get(
  "/connect/google-calendar",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  calendarController.connectGoogle
);

calendarRouter.get(
  "/connect/google-calendar/callback",
  calendarController.connectGoogleCallback
);

calendarRouter.delete(
  "/disconnect/google-calendar",
  validateToken,
  calendarController.disconnectGoogle
);

calendarRouter.post(
  "/connect/cal-com",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  validateDTO(ConnectCalcomDto),
  calendarController.connectCalcom
);

calendarRouter.delete(
  "/disconnect/cal-com",
  validateToken,
  calendarController.disconnectCalcom
);
