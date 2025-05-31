import { NotificationController } from "@/controllers";
import { createRouter } from "@/helpers";
import { validateToken } from "@/middlewares";

export const notificationRouter = createRouter();

const notificationController = NotificationController.getInstance();

notificationRouter.use(validateToken);

notificationRouter.get("/all", notificationController.getAllNotifications);

notificationRouter.patch(
  "/all/read",
  notificationController.markAllNoficationsAsRead
);
