import { TemplatesController } from "@/controllers";
import { CreateTemplateDto, UpdateTemplateDto } from "@/decorators";
import { createRouter } from "@/helpers";
import { validateDTO, validateToken } from "@/middlewares";

export const templatesRouter = createRouter();
const templatesController = TemplatesController.getInstance();

templatesRouter.use(validateToken);

templatesRouter.get("/analytics", templatesController.anayltics);
templatesRouter.post(
  "/create",
  validateDTO(CreateTemplateDto),
  templatesController.createTemplate
);
templatesRouter.get("/user/all", templatesController.getUserTemplates);
templatesRouter.patch(
  "/update/:id",
  validateDTO(UpdateTemplateDto),
  templatesController.updateTemplate
);
templatesRouter.delete("/delete/:id", templatesController.deleteTemplate);
