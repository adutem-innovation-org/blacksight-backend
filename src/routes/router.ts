import { createRouter } from "@/helpers";
import { authRouter } from "./auth.routes";

export const appRouter = createRouter();

appRouter.use("/auth", authRouter);
