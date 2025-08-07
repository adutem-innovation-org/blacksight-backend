import { PaymentTrackerController } from "@/controllers";
import {
  CreatePaymentFileDto,
  UpdateBCPDto,
  UpdatePaymentFileDto,
} from "@/decorators";
import { createRouter } from "@/helpers";
import { uploadSingleFile, validateDTO, validateToken } from "@/middlewares";
import { PaymentTrackerService } from "@/services";

export const paymentTrackerRouter = createRouter();
const paymentTrackerController = PaymentTrackerController.getInstance();

paymentTrackerRouter.use(validateToken);

paymentTrackerRouter.post(
  "/payment-files/upload",
  uploadSingleFile({
    name: "file",
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
    configs: {
      dest: "uploads/",
    },
  }),
  PaymentTrackerService.middlewares.parsePaymentFile,
  validateDTO(CreatePaymentFileDto),
  paymentTrackerController.uploadPaymentFile
);
paymentTrackerRouter.get(
  "/payment-files/all",
  paymentTrackerController.getAllPaymentFiles
);
paymentTrackerRouter.get(
  "/payment-files/:id",
  paymentTrackerController.getPaymentFileById
);
paymentTrackerRouter.patch(
  "/payment-files/:id",
  uploadSingleFile({
    name: "file",
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
    configs: {
      dest: "uploads/",
    },
  }),
  PaymentTrackerService.middlewares.parsePaymentFile,
  validateDTO(UpdatePaymentFileDto),
  paymentTrackerController.updatePaymentFile
);
paymentTrackerRouter.delete(
  "/payment-files/:id",
  paymentTrackerController.deletePaymentFile
);

// BCPs
paymentTrackerRouter.get(
  "/payment-files/:fileId/bcps",
  paymentTrackerController.getPaymentFileBCPs
);
paymentTrackerRouter.get("/bcps/:id", paymentTrackerController.getBCPById);
paymentTrackerRouter.patch(
  "/bcps/:id",
  validateDTO(UpdateBCPDto),
  paymentTrackerController.updateBCP
);
paymentTrackerRouter.delete("/bcps/:id", paymentTrackerController.deleteBCP);
