import { Intent, LiveAgentIntent } from "@/enums";

export * from "./instructions";

// export const intentActionsMapper: Record<Intent, string> = {
//   BOOK_APPOINTMENT:
//     "You started an appointment booking process. Next probable course of action should be to ask for the user's preferred appointment date.",
//   SET_APPOINTMENT_DATE:
//     "You set the user's appointment date. Next probable course of action should be to ask for their preferred time.",
//   SET_APPOINTMENT_TIME:
//     "You set the user's appointment time. Next probable course of action should be to ask for the email they intent to use.",
//   SET_APPOINTMENT_EMAIL:
//     "You set the user's appointment email. Next probable course of action is to inform them that their appointment is all set, and that they will hear from us (the business) soon.",
//   UNKNOWN: "You did nothing in terms of actionable functions",
// };

export const intentActionsMapper: Record<Intent, string> = {
  BOOK_APPOINTMENT:
    "You started an appointment booking process. Next probable course of action should be to ask for the user's email address first.",
  SET_APPOINTMENT_EMAIL:
    "You collected the user's email address. Next probable course of action should be to ask for their full name.",
  SET_APPOINTMENT_NAME:
    "You collected the user's name. Next probable course of action should be to ask for their phone number.",
  SET_APPOINTMENT_PHONE:
    "You collected the user's phone number. Next probable course of action should be to ask for their preferred appointment date.",
  SET_APPOINTMENT_DATE:
    "You set the user's appointment date. Next probable course of action should be to ask for their preferred time.",
  SET_APPOINTMENT_TIME:
    "You set the user's appointment time. Next probable course of action is to inform them that their appointment is all set, and that they will hear from us (the business) soon.",
  SET_APPOINTMENT_DATE_AND_TIME:
    "The user has provided both a date and time for the appointment. If any required details like email, name, or phone are still missing, ask for them in order. Otherwise, confirm the appointment politely and clearly.",
  END_CONVERSATION:
    "The user indicates the conversation is complete. Respond with a courteous closing like: 'Great! If you have any more questions later, feel free to reach out. Have a great day!'",
  GENERAL_INQUIRY:
    "You provided general information or answered a question without any appointment-related action",
};

export const liveAgentIntentActionsMapper: Record<LiveAgentIntent, string> = {
  BOOK_APPOINTMENT:
    "You detected the user wants to book an appointment. Direct them to fill out the appointment form that will appear. Wait for form completion or cancellation actions from the frontend.",

  ESCALATE_CHAT:
    "The user confirmed they want to create a support ticket after you couldn't help with their inquiry. Direct them to fill out the escalation ticket form that will appear. Wait for form completion or cancellation actions from the frontend.",

  GENERAL_INQUIRY:
    "You provided general information or answered a question. If you cannot answer their question with your current knowledge base, offer to create a support ticket with the support team.",

  END_CONVERSATION:
    "The user indicates the conversation is complete. Respond with a courteous closing like: 'Great! If you have any more questions later, feel free to reach out. Have a great day!'",
};

export const functionToIntentMapper: Record<
  string,
  { intent: LiveAgentIntent; message: string }
> = {
  initiate_appointment_booking: {
    intent: LiveAgentIntent.BOOK_APPOINTMENT,
    message: "Please fill out the booking form below",
  },
  initiate_escalation_ticket: {
    intent: LiveAgentIntent.ESCALATE_CHAT,
    message: "Please fill out the support ticket form below",
  },
};
