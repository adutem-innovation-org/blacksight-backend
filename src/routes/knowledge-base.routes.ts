import { KnowledgeBaseController } from "@/controllers";
import { AddKnowledgeBaseDto, GenerateKnowledgeBaseDto } from "@/decorators";
import { KnowledgeBaseSources, UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  rateLimiter,
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

// Can only upload 10 knowledge base in 5 minutes
knowledgeBaseRouter.post(
  "/create",
  rateLimiter({
    limit: 10,
    ttl: 5 * 60 * 1000,
  }),
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
    required: (req) => req.body.source === KnowledgeBaseSources.FILE,
  }),
  validateDTO(AddKnowledgeBaseDto),
  knowledgeBaseController.addKnowledgeBase
);

knowledgeBaseRouter.post(
  "/generate",
  rateLimiter({
    limit: 10,
    ttl: 5 * 60 * 1000,
  }),
  permissionRequirement([UserTypes.USER]),
  validateDTO(GenerateKnowledgeBaseDto),
  knowledgeBaseController.generateKnowledgeBase
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
