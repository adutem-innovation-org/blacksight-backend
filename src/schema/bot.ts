// Structured output schema for intent detection
export const intentDetectionSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "BOOK_APPOINTMENT",
        "SET_APPOINTMENT_EMAIL",
        "SET_APPOINTMENT_DATE",
        "SET_APPOINTMENT_TIME",
        "GENERAL_INQUIRY",
      ],
    },
    parameters: {
      type: "object",
      properties: {
        email: { type: ["string", "null"], format: "email" },
        date: { type: ["string", "null"], format: "date" },
        time: { type: ["string", "null"], format: "time" },
      },
      required: ["email", "date", "time"],
      additionalProperties: false,
    },
    message: {
      type: "string",
    },
  },
  required: ["intent", "parameters", "message"],
  additionalProperties: false,
};
