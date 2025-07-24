import { createRouter } from "@/helpers";
import { authRouter } from "./auth.routes";
import { analyticsRouter } from "./analytics.routes";
import { reminderRouter } from "./reminder.routes";
import { knowledgeBaseRouter } from "./knowledge-base.routes";
import { botRouter } from "./bot.routes";
import { calendarRouter } from "./calendar.routes";
import { appointmentRouter } from "./appointment.routes";
import { notificationRouter } from "./notification.routes";
import { apiKeyRouter } from "./api-key.routes";
import { settingsRouter } from "./settings.routes";

export const appRouter = createRouter();

appRouter.use("/analytics", analyticsRouter);
appRouter.use("/appointment", appointmentRouter);
appRouter.use("/auth", authRouter);
appRouter.use("/bot", botRouter);
appRouter.use("/knowledge-base", knowledgeBaseRouter);
appRouter.use("/meeting-provider", calendarRouter);
appRouter.use("/reminder", reminderRouter);
appRouter.use("/notification", notificationRouter);
appRouter.use("/api-key", apiKeyRouter);
appRouter.use("/settings", settingsRouter);
