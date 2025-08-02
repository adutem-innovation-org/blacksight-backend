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
    name: "collect_appointment_name",
    description: "Collect user's full name for appointment",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "User's full name",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "collect_appointment_phone",
    description: "Collect and validate user's phone number for appointment",
    parameters: {
      type: "object",
      properties: {
        phone: {
          type: "string",
          description: "User's phone number",
        },
      },
      required: ["phone"],
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
          format: "date",
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
          description: "Appointment time in HH:MM format (24 hours)",
          format: "time",
        },
      },
      required: ["time"],
      additionalProperties: false,
    },
  },
  {
    name: "set_appointment_date_and_time",
    description: "Set the appointment date and time",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Appointment date in YYYY-MM-DD format",
          format: "date",
        },
        time: {
          type: "string",
          description: "Appointment time in HH:MM format (24-hours)",
          format: "time",
        },
      },
      required: ["date", "time"],
      additionalProperties: false,
    },
  },
];

export const liveAgentFunctions = [
  {
    name: "initiate_appointment_booking",
    description:
      "Start the appointment booking process when user is ready to book",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "provide_booking_information",
    description:
      "Provide information about booking process and seek confirmation",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "initiate_escalation_ticket",
    description:
      "Start the support ticket escalation process when user confirms",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "provide_escalation_information",
    description:
      "Provide information about escalation process and seek confirmation",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];
