export enum AppointmentStatus {
  PENDING = "pending",
  SCHEDULED = "scheduled",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum MeetingProvidersEnum {
  ZOOM = "zoom-meet",
  GOOGLE = "google-meet",
  MICROSOFT = "microsoft-teams",
}

export enum AppointmentParam {
  DATE = "date",
  TIME = "time",
  EMAIL = "email",
  NAME = "name",
  PHONE = "phone",
  DATE_TIME = "date-time",
}
