export enum BotStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum Intent {
  BOOK_APPOINTMENT = "BOOK_APPOINTMENT",
  SET_APPOINTMENT_DATE = "SET_APPOINTMENT_DATE",
  SET_APPOINTMENT_TIME = "SET_APPOINTMENT_TIME",
  SET_APPOINTMENT_EMAIL = "SET_APPOINTMENT_EMAIL",
  // UNKNOWN = "UNKNOWN",
  GENERAL_INQUIRY = "GENERAL_INQUIRY",
}

export interface IntentResult {
  intent: Intent;
  parameters?: Record<string, string>;
  message: string;
}
