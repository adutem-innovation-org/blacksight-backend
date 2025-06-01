// Function definitions for OpenAI function calling
export const appointmentFunctions = [
  {
    name: "initiate_appointment_booking",
    description: "Start the appointment booking process",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "collect_appointment_email",
    description: "Collect and validate user's email for appointment",
    parameters: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "User's email address",
        },
      },
      required: ["email"],
      additionalProperties: false,
    },
  },
  {
    name: "set_appointment_date",
    description: "Set the appointment date",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Appointment date in YYYY-MM-DD format",
        },
      },
      required: ["date"],
      additionalProperties: false,
    },
  },
  {
    name: "set_appointment_time",
    description: "Set the appointment time",
    parameters: {
      type: "object",
      properties: {
        time: {
          type: "string",
          description: "Appointment time in HH:MM format",
        },
      },
      required: ["time"],
      additionalProperties: false,
    },
  },
];
