import { KnowledgeBaseController } from "@/controllers";
import { AddKnowledgeBaseDto } from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  uploadSingleFile,
  validateDTO,
  validateToken,
} from "@/middlewares";

export const knowledgeBaseRouter = createRouter();
const knowledgeBaseController = KnowledgeBaseController.getInstance();

knowledgeBaseRouter.use(validateToken);

knowledgeBaseRouter.get(
  "/analytics",
  knowledgeBaseController.knowledgeBaseAnaylytics
);

knowledgeBaseRouter.post(
  "/create",
  permissionRequirement([UserTypes.USER]),
  uploadSingleFile({
    name: "file",
    mimeTypes: [
      "text/plain", // .txt
      "text/markdown", // .md
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/pdf", // .pdf
    ],
    configs: {
      dest: "uploads/",
    },
    required: true,
  }),
  validateDTO(AddKnowledgeBaseDto),
  knowledgeBaseController.addKnowledgeBase
);

knowledgeBaseRouter.get(
  "/all",
  permissionRequirement([UserTypes.USER, UserTypes.ADMIN]),
  knowledgeBaseController.getAllKnowledgeBase
);

knowledgeBaseRouter.get("/:id", knowledgeBaseController.getKnowledgeBaseById);

knowledgeBaseRouter.delete(
  "/delete/:id",
  permissionRequirement([UserTypes.USER]),
  knowledgeBaseController.deleteKnowledgeBase
);

knowledgeBaseRouter.patch("/activate/:id", knowledgeBaseController.activateKB);

knowledgeBaseRouter.patch(
  "/deactivate/:id",
  knowledgeBaseController.deactivateKB
);
