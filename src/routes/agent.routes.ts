import { AgentController } from "@/controllers";
import { createRouter } from "@/helpers";
import { verifyApiKey } from "@/middlewares";

export const agentRouter = createRouter();
const agentController = AgentController.getInstance();

agentRouter.get("/connect", verifyApiKey, agentController.connect);
