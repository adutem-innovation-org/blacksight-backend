import { createRouter } from "@/helpers";
import { authRouter } from "./auth.routes";
import { analyticsRouter } from "./analytics.routes";
import { reminderRouter } from "./reminder.routes";
import { knowledgeBaseRouter } from "./knowledge-base.routes";
import { botRouter } from "./bot.routes";

export const appRouter = createRouter();

appRouter.use("/auth", authRouter);
appRouter.use("/analytics", analyticsRouter);
appRouter.use("/reminder", reminderRouter);
appRouter.use("/knowledge-base", knowledgeBaseRouter);
appRouter.use("/bot", botRouter);
