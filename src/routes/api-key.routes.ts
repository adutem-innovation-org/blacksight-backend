import { ApiKeyController } from "@/controllers";
import { createRouter } from "@/helpers";
import { validateToken } from "@/middlewares";

export const apiKeyRouter = createRouter();

const apiKeyController = ApiKeyController.getInstance();

apiKeyRouter.use(validateToken);

apiKeyRouter.post("/create", apiKeyController.createApiKey);

apiKeyRouter.put("/reset/:id", apiKeyController.resetApiKey);

apiKeyRouter.get("/all", apiKeyController.getAllApiKeys);
