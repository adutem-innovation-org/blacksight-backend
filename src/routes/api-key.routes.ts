import { ApiKeyController } from "@/controllers";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import { permissionRequirement, validateToken } from "@/middlewares";

export const apiKeyRouter = createRouter();

const apiKeyController = ApiKeyController.getInstance();

apiKeyRouter.use(validateToken);

apiKeyRouter.post(
  "/create",
  permissionRequirement([UserTypes.USER]),
  apiKeyController.createApiKey
);

apiKeyRouter.put("/regenerate/:id", apiKeyController.regenerateApiKey);

apiKeyRouter.get(
  "/all",
  permissionRequirement([UserTypes.ADMIN]),
  apiKeyController.getAllApiKeys
);

apiKeyRouter.get("/user/key", apiKeyController.getUserApiKey);

apiKeyRouter.patch(
  "/revoke/:id",
  permissionRequirement([UserTypes.ADMIN]),
  apiKeyController.revokeApiKey
);

apiKeyRouter.patch(
  "/reactivate/:id",
  permissionRequirement([UserTypes.ADMIN]),
  apiKeyController.reactivateApiKey
);

apiKeyRouter.patch(
  "/deactivate/:id",
  permissionRequirement([UserTypes.USER]),
  apiKeyController.deactivateApiKey
);

apiKeyRouter.patch(
  "/activate/:id",
  permissionRequirement([UserTypes.ADMIN, UserTypes.USER]),
  apiKeyController.activateApiKey
);
