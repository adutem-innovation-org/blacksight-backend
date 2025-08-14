import { ReminderController } from "@/controllers";
import {
  CreateReminderDto,
  SendInstantReminderDto,
  UpdateReminderDto,
} from "@/decorators";
import { UserTypes } from "@/enums";
import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  rateLimiter,
  validateDTO,
  validateToken,
} from "@/middlewares";
import { PaymentTrackerService } from "@/services";

export const reminderRouter = createRouter();
export const reminderController = ReminderController.getInstance();

// Apply authentication to all routes
reminderRouter.use(validateToken);

// Send instant reminder (higher rate limit due to immediate nature)
reminderRouter.post(
  "/instant",
  rateLimiter({ limit: 20, ttl: 5 * 60 * 1000 }), // 20 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  PaymentTrackerService.middlewares.extractBCPFromFile,
  validateDTO(SendInstantReminderDto),
  reminderController.sendInstantReminder
);

reminderRouter.post(
  "/instant/bcp",
  rateLimiter({ limit: 20, ttl: 5 * 60 * 1000 }),
  permissionRequirement([UserTypes.USER]),
  validateDTO(SendInstantReminderDto),
  reminderController.sendInstantReminder
);

// Send instant reminder (higher rate limit due to immediate nature)
reminderRouter.post(
  "/instant/appointment",
  rateLimiter({ limit: 20, ttl: 5 * 60 * 1000 }),
  permissionRequirement([UserTypes.USER]),
  validateDTO(SendInstantReminderDto),
  reminderController.sendInstantReminder
);

// Create reminder (scheduled, recurring, or event-based)
reminderRouter.post(
  "/create",
  rateLimiter({ limit: 50, ttl: 5 * 60 * 1000 }), // 50 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  PaymentTrackerService.middlewares.extractBCPFromFile,
  validateDTO(CreateReminderDto),
  reminderController.createReminder
);

// Create reminder (scheduled, recurring, or event-based)
reminderRouter.post(
  "/create/bcp",
  rateLimiter({ limit: 50, ttl: 5 * 60 * 1000 }), // 50 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  validateDTO(CreateReminderDto),
  reminderController.createReminder
);

// Create reminder (scheduled, recurring, or event-based)
reminderRouter.post(
  "/create/appointment",
  rateLimiter({ limit: 50, ttl: 5 * 60 * 1000 }), // 50 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  validateDTO(CreateReminderDto),
  reminderController.createReminder
);

// Update reminder
reminderRouter.patch(
  "/update/:id",
  rateLimiter({ limit: 30, ttl: 5 * 60 * 1000 }), // 30 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  validateDTO(UpdateReminderDto),
  reminderController.updateReminder
);

// Get all reminders for authenticated user
reminderRouter.get(
  "/all",
  rateLimiter({ limit: 100, ttl: 5 * 60 * 1000 }), // 100 requests per 5 minutes
  reminderController.getReminders
);

// Get reminder by ID
reminderRouter.get(
  "/:id",
  rateLimiter({ limit: 100, ttl: 5 * 60 * 1000 }), // 100 requests per 5 minutes
  reminderController.getReminderById
);

// Pause reminder
reminderRouter.patch(
  "/pause/:id",
  rateLimiter({ limit: 20, ttl: 5 * 60 * 1000 }), // 20 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  reminderController.pauseReminder
);

// Resume reminder
reminderRouter.patch(
  "/resume/:id",
  rateLimiter({ limit: 20, ttl: 5 * 60 * 1000 }), // 20 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  reminderController.resumeReminder
);

// Cancel reminder
reminderRouter.patch(
  "/cancel/:id",
  rateLimiter({ limit: 20, ttl: 5 * 60 * 1000 }), // 20 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  reminderController.cancelReminder
);

// Delete reminder (hard delete)
reminderRouter.delete(
  "/delete/:id",
  rateLimiter({ limit: 10, ttl: 5 * 60 * 1000 }), // 10 requests per 5 minutes
  permissionRequirement([UserTypes.USER]),
  reminderController.deleteReminder
);

// Get reminder analytics
reminderRouter.get(
  "/analytics/summary",
  rateLimiter({ limit: 50, ttl: 5 * 60 * 1000 }), // 50 requests per 5 minutes
  reminderController.getReminderAnalytics
);

// Cleanup completed reminders (admin only)
reminderRouter.delete(
  "/cleanup/completed",
  rateLimiter({ limit: 5, ttl: 60 * 60 * 1000 }), // 5 requests per hour
  permissionRequirement([UserTypes.ADMIN]), // Admin only for cleanup
  reminderController.cleanupReminders
);
