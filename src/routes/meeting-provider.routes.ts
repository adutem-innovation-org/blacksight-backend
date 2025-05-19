import { MeetingProviderController } from "@/controllers";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  validateDTO,
  validateToken,
} from "@/middlewares";

export const meetingProviderRouter = createRouter();
const meetingProviderController = MeetingProviderController.getInstance();

meetingProviderRouter.get(
  "/connected",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  meetingProviderController.getConnectedProviders
);

meetingProviderRouter.get(
  "/connect/google-meet",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  meetingProviderController.connectGoogle
);

meetingProviderRouter.get(
  "/connect/google-meet/callback",
  meetingProviderController.connectGoogleCallback
);

meetingProviderRouter.delete(
  "/disconnect/google-meet",
  validateToken,
  meetingProviderController.disconnectGoogle
);
