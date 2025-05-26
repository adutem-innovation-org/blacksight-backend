import { Intent } from "@/enums";

export * from "./instructions";

export const intentActionsMapper: Record<Intent, string> = {
  BOOK_APPOINTMENT:
    "You started an appointment booking process. Next probable course of action should be to ask for the user's preferred appointment date.",
  SET_APPOINTMENT_DATE:
    "You set the user's appointment date. Next probable course of action should be to ask for their preferred time.",
  SET_APPOINTMENT_TIME:
    "You set the user's appointment time. Next probable course of action should be to ask for the email they intent to use.",
  SET_APPOINTMENT_EMAIL:
    "You set the user's appointment email. Next probable course of action is to inform them that their appointment is all set, and that they will hear from us (the business) soon.",
  UNKNOWN: "You did nothing in terms of actionable functions",
};
