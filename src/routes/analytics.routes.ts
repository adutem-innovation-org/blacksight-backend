import { AnalyticsController } from "@/controllers";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import { permissionRequirement, validateToken } from "@/middlewares";

const analyticsController = AnalyticsController.getInstance();
export const analyticsRouter = createRouter();

analyticsRouter.use(validateToken);

analyticsRouter.get(
  "/user",
  permissionRequirement([UserTypes.USER]),
  analyticsController.getBusinessAnalytics
);

analyticsRouter.get(
  "/admin",
  permissionRequirement([UserTypes.ADMIN]),
  analyticsController.getAdminAnalytics
);
