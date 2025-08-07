import { ProductRecommendationController } from "@/controllers";
import { AddProductsSourceDto } from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  rateLimiter,
  uploadSingleFile,
  validateDTO,
  validateToken,
} from "@/middlewares";

export const productRecommendationRouter = createRouter();
export const productRecommendationController =
  ProductRecommendationController.getInstance();

productRecommendationRouter.use(validateToken);

productRecommendationRouter.post(
  "/source/add",
  rateLimiter({ limit: 10, ttl: 5 * 60 * 1000 }),
  permissionRequirement([UserTypes.USER]),
  uploadSingleFile({
    name: "file",
    mimeTypes: [
      "text/plain",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/json",
    ],
    configs: {
      dest: "uploads/",
    },
  }),
  validateDTO(AddProductsSourceDto),
  productRecommendationController.addProductsSource
);

productRecommendationRouter.get(
  "/sources/all",
  productRecommendationController.getAllProductsSources
);

productRecommendationRouter.delete(
  "/delete/:id",
  permissionRequirement([UserTypes.USER]),
  productRecommendationController.deleteProductsSource
);
