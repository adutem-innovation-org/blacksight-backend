import { AppointmentController } from "@/controllers";
import { UpdateAppointmentStatusDto } from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  validateDTO,
  validateToken,
} from "@/middlewares";

export const appointmentRouter = createRouter();
const appointmentController = AppointmentController.getInstance();

appointmentRouter.use(validateToken);

appointmentRouter.get("/analytics", appointmentController.getAnalytics);

appointmentRouter.get(
  "/all",
  permissionRequirement([UserTypes.USER, UserTypes.ADMIN]),
  appointmentController.getAllAppointments
);

appointmentRouter.patch(
  "/status/:id",
  permissionRequirement([UserTypes.USER]),
  validateDTO(UpdateAppointmentStatusDto),
  appointmentController.updateAppointmentStatus
);

appointmentRouter.route("/:id").get(appointmentController.getAppointment);

appointmentRouter.delete(
  "/delete/:id",
  permissionRequirement([UserTypes.USER, UserTypes.ADMIN]),
  appointmentController.deleteAppointment
);
