// export enum ReminderChannels {
//   SMS = "sms",
//   EMAIL = "email",
// }

// export enum ReminderTypes {
//   APPOINTMENT = "appointment",
//   PAYMENT = "payment",
// }

// Enhanced Enums
export enum ReminderChannels {
  SMS = "sms",
  EMAIL = "email",
  BOTH = "both", // Send to both SMS and EMAIL
}

export enum ReminderTypes {
  INSTANT = "instant",
  SCHEDULED = "scheduled",
  RECURRING = "recurring",
  EVENT_BASED = "event_based",
}

export enum ReminderCategory {
  PAYMENT = "payment",
  APPOINTMENT = "appointment",
}

export enum RecurrencePattern {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  WEEKDAYS = "weekdays", // Monday to Friday
  WEEKENDS = "weekends", // Saturday and Sunday
  FIRST_DAY_OF_WEEK = "first_day_of_week",
  LAST_DAY_OF_WEEK = "last_day_of_week",
  FIRST_DAY_OF_MONTH = "first_day_of_month",
  LAST_DAY_OF_MONTH = "last_day_of_month",
  FIRST_MONDAY_OF_MONTH = "first_monday_of_month",
  LAST_FRIDAY_OF_MONTH = "last_friday_of_month",
  EVERY_N_DAYS = "every_n_days", // Custom interval
  EVERY_N_WEEKS = "every_n_weeks",
  EVERY_N_MONTHS = "every_n_months",
  CUSTOM = "custom", // For complex patterns
}

export enum EventTrigger {
  BEFORE = "before",
  AFTER = "after",
  ON = "on",
}

export enum ReminderStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  CANCELLED = "cancelled",
  COMPLETED = "completed", // For recurring reminders that have ended
}
