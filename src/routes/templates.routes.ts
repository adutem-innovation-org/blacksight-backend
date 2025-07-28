import { TemplatesController } from "@/controllers";
import { createRouter } from "@/helpers";
import { validateToken } from "@/middlewares";

export const templatesRouter = createRouter();
const templatesController = TemplatesController.getInstance();

templatesRouter.use(validateToken);

templatesRouter.get("/analytics", templatesController.anayltics);
templatesRouter.post("/create", templatesController.createTemplate);
templatesRouter.get("/user/all", templatesController.getUserTemplates);
templatesRouter.patch("/update/:id", templatesController.updateTemplate);
templatesRouter.delete("/delete/:id", templatesController.deleteTemplate);
