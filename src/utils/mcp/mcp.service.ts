import { RoleEnum } from "@/enums";
import { IBot, IMessage } from "@/models";
import {
  AppointmentService,
  BotSharedService,
  ConversationService,
  KnowledgeBaseService,
} from "@/services";

export class McpService {
  private static instance: McpService;

  private readonly conversationService: ConversationService;
  private readonly appointmentService: AppointmentService;
  private readonly botSharedService: BotSharedService;
  private readonly knowledgeBaseService: KnowledgeBaseService;

  constructor() {
    this.conversationService = ConversationService.getInstance();
    this.appointmentService = AppointmentService.getInstance();
    this.botSharedService = BotSharedService.getInstance();
    this.knowledgeBaseService = KnowledgeBaseService.getInstace();
  }

  static getInstance(): McpService {
    if (!this.instance) {
      this.instance = new McpService();
    }
    return this.instance;
  }

  async buildMCPContext({
    bot,
    appointmentId,
    conversationId,
    businessId,
    userQuery,
  }: {
    bot: IBot;
    appointmentId: string;
    conversationId: string;
    businessId: string;
    userQuery: string;
  }) {
    const botId = bot._id.toString();

    // Get current session's appointment context
    const appointmentContext =
      await this.appointmentService.constructAppoinmentAsContext(appointmentId);

    // Get or create conversation
    let conversation = await this.conversationService.getOrCreateConversation(
      conversationId,
      botId,
      businessId
    );

    // Process conversation with optimized context
    const { summaries, unsummarizedMessages } =
      await this.conversationService.processConversation(conversation);

    // Save user message
    // ✅ This approach was reversed because we don't want to summarize the message the user just sent... Rather we want to summarize only past conversation if they are up to the required threshold
    conversation = await this.conversationService.saveUserMessage(
      conversation,
      userQuery
    );

    // Extract relevant knowledge base
    const extractedKB = await this.knowledgeBaseService.extractKnowledgeBase(
      bot,
      businessId,
      userQuery
    );

    // Get custom instructions
    const customInstruction =
      bot.instructions ?? "No custom instruction from the business.";

    // Current date for proper appointment date referencing
    const currentDate = new Date().toISOString().split("T")[0];

    // Instruction on how the bot should behave and the right contexts
    const developerPrompt = this.createDeveloperPrompt(
      summaries,
      extractedKB,
      customInstruction,
      currentDate,
      appointmentContext
    );

    // Messages array for LLM
    const messages = this.buildBotMessages({
      developerPrompt,
      unsummarizedMessages,
      userQuery,
    });

    return {
      unsummarizedMessages,
      messages,
      summaries,
      extractedKB,
      customInstruction,
    };
  }

  buildBotMessages({
    developerPrompt,
    unsummarizedMessages,
    userQuery,
  }: {
    developerPrompt: string;
    unsummarizedMessages: IMessage[];
    userQuery: string;
  }) {
    // Current date for proper appointment date referencing
    const currentDate = new Date().toISOString().split("T")[0];

    const messages = this.buildMessages({
      prompt: developerPrompt,
      unsummarizedMessages,
      userQuery,
    });

    // This snippet of code ensure that appointment dates are resolved based on the current date.
    messages.unshift({
      role: RoleEnum.SYSTEM,
      content: `Today's date is ${currentDate}. Always resolve relative dates like "next week" based on this.`,
    });

    return messages;
  }

  createDeveloperPrompt(
    summaries: string[],
    extractedKB: string,
    customInstruction: string,
    currentDate: string,
    appointmentContext: string
  ) {
    return `
    You are an advanced intent detection and response assistant for a business chatbot.

    CLASSIFICATION INTENTS:
    - BOOK_APPOINTMENT: User wants to book/schedule an appointment
    - SET_APPOINTMENT_EMAIL: User provides email for appointment (PRIORITY - collect this first)
    - SET_APPOINTMENT_NAME: User provides their name for appointment
    - SET_APPOINTMENT_PHONE: User provides their phone number for appointment
    - SET_APPOINTMENT_DATE: User provides or wants to set appointment date
    - SET_APPOINTMENT_TIME: User provides or wants to set appointment time  
    - SET_APPOINTMENT_DATE_AND_TIME: User provides or wants to set both date and time in one message
    - GENERAL_INQUIRY: General questions, information requests, or other business-related queries
    - END_CONVERSATION: If the user says things like "no further inquiry", "that's all", or "I'm done", "nothing else", "that will be all for now", "thank you for your time". 

    FUNCTION CALLING REQUIREMENTS:
    1. When the user provides email, name, phone, date, and time (either gradually or via SET_APPOINTMENT_DATE_AND_TIME), emit all related function calls:
      collect_appointment_email
      collect_appointment_name
      collect_appointment_phone
      set_appointment_date
      set_appointment_time
    This is required even if some values were already set earlier, for reinforcement and consistency.
    Emit these function calls at the end of the appointment flow or during SET_APPOINTMENT_DATE_AND_TIME. 

    APPOINTMENT BOOKING FLOW:
    1. First collect EMAIL (most important)
    2. Then collect NAME
    3. Then collect PHONE NUMBER
    4. Then collect DATE
    5. Finally collect TIME
    6. Confirm appointment details with user before finalizing

    CRITICAL DATA HANDLING RULES:
    - NEVER pass data from the Knowledge Base as parameters or function arguments
    - Only use actual user-provided data for function calls and parameters
    - Knowledge Base information should only be used for context and responses, not as extracted data

    APPOINTMENT CONFIRMATION REQUIREMENT:
    After collecting all necessary parameters (email, name, phone, date, time), ALWAYS provide a detailed confirmation summary before finalizing the appointment. Format it as follows:

    "Thank you for your patience. Here are the details for your appointment:
    
    * **Name:** [User's Name]
    * **Phone Number:** [User's Phone]
    * **Date and Time:** [Formatted Date and Time]
    * **Email:** [User's Email]
    
    If everything looks good, I'll proceed with scheduling your appointment. Please let me know if you need any changes."

    CONTEXT INFORMATION:
    Business Instructions: ${customInstruction}

    Knowledge Base: ${extractedKB}

    Conversation History: ${summaries.join("\n")}

    ${appointmentContext}

    RESPONSE REQUIREMENTS:
    1. Always return valid JSON in the specified schema
    2. Provide natural, helpful messages
    3. Use knowledge base information when relevant for context only
    4. For appointments, follow the email → name → phone → date → time → confirmation sequence
    5. Confirm appointment details once all information is collected
    6. Be conversational and professional
    7. Extract parameters accurately (email format, date as YYYY-MM-DD, time as HH:MM)
    8. Treat relative dates like "next Friday", "tomorrow", "next tomorrow" relative to the current date: ${currentDate}
    9. Never use Knowledge Base data as function parameters - only use actual user input

    Your response must be valid JSON with "intent", "message", and optional "parameters" fields.`;
  }

  buildMessages({
    prompt,
    unsummarizedMessages,
    userQuery,
  }: {
    prompt: string;
    unsummarizedMessages: IMessage[];
    userQuery: string;
  }) {
    return [
      { role: RoleEnum.DEVELOPER, content: prompt },
      ...unsummarizedMessages,
      { role: RoleEnum.USER, content: userQuery },
    ];
  }

  createContextualPrompt(
    summaries: string[],
    extractedKB: string,
    customInstruction: string,
    lastAction: string
  ) {
    const contextualPrompt = `You are a helpful business chatbot assistant.
    
        Business Instructions:
        ${customInstruction}
    
        Knowledge Base Information:
        ${extractedKB}
    
        Conversation Summaries:
        ${summaries.join("\n")}
    
        Last Action Context:
        ${lastAction}
    
        Provide a helpful, natural response to the user's query. Be conversational and reference relevant information from the knowledge base when applicable.`;

    return contextualPrompt;
  }
}
