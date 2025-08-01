// Structured output schema for intent detection
export const intentDetectionSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "BOOK_APPOINTMENT",
        "SET_APPOINTMENT_EMAIL",
        "SET_APPOINTMENT_NAME",
        "SET_APPOINTMENT_PHONE",
        "SET_APPOINTMENT_DATE",
        "SET_APPOINTMENT_TIME",
        "GENERAL_INQUIRY",
        "END_CONVERSATION",
      ],
    },
    parameters: {
      type: "object",
      properties: {
        email: { type: ["string", "null"], format: "email" },
        name: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        date: { type: ["string", "null"], format: "date" },
        time: { type: ["string", "null"], format: "time" },
      },
      required: ["email", "name", "phone", "date", "time"],
      additionalProperties: false,
    },
    message: {
      type: "string",
    },
  },
  required: ["intent", "parameters", "message"],
  additionalProperties: false,
};

export const liveAgentIntentDetectionSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "BOOK_APPOINTMENT",
        "BOOKING_ENQUIRY",
        "ESCALATE_CHAT",
        "ESCALATION_ENQUIRY",
        "GENERAL_INQUIRY",
        "END_CONVERSATION",
      ],
    },
    parameters: {
      type: "object",
      properties: {
        // extracted_info: { type: ["string", "null"] },
        // user_response: { type: ["string", "null"] },
      },
      // required: ["extracted_info", "user_response"],
      additionalProperties: false,
    },
    message: {
      type: "string",
    },
  },
  required: ["intent", "parameters", "message"],
  additionalProperties: false,
};
