import { TicketController } from "@/controllers";
import { ReplyTicketDto, UpdateTicketStatusDto } from "@/decorators";
import { createRouter } from "@/helpers";
import { validateDTO, validateToken } from "@/middlewares";

export const ticketRouter = createRouter();

const ticketController = TicketController.getInstance();

ticketRouter.get("/customer/ticket/:id", ticketController.getCustomerTicket);
ticketRouter.post(
  "/customer/reply/:id",
  validateDTO(ReplyTicketDto),
  ticketController.customerReplyTicket
);

ticketRouter.use(validateToken);
ticketRouter.use("/all", ticketController.getAllTickets);
ticketRouter.get("/analytics", ticketController.analytics);
ticketRouter.get("/:id", ticketController.getTicketById);
ticketRouter.patch(
  "/status/:id",
  validateDTO(UpdateTicketStatusDto),
  ticketController.updateTicketStatus
);
ticketRouter.patch("/priority/:id", ticketController.updateTicketPriority);
ticketRouter.delete("/delete/:id", ticketController.deleteTicket);
ticketRouter.post(
  "/reply/:id",
  validateDTO(ReplyTicketDto),
  ticketController.replyTicket
);
