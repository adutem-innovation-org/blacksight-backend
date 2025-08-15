import { throwNotFoundError, throwUnprocessableEntityError } from "@/helpers";
import { AuthData } from "@/interfaces";
import {
  Bot,
  Business,
  IBot,
  IBusiness,
  IConversation,
  IUser,
  User,
} from "@/models";
import { Model } from "mongoose";
import { BotService, ConversationService } from "../bot";
import { AppointmentStatus, RoleEnum, UserActions } from "@/enums";
import { AudioConverter, CacheService, MailgunEmailService } from "@/utils";
import { Types } from "mongoose";
import fs, { Mode } from "fs";
import path from "path";
import { config } from "@/config";
import OpenAI from "openai";
import { AskAgentDto, BookingRequestDto, SubmitTicketDto } from "@/decorators";
import { AppointmentService } from "../appointment";
import { format, fromZonedTime } from "date-fns-tz";
import { TicketService } from "../ticket";

export class AgentService {
  private static instance: AgentService;

  private readonly agentModel: Model<IBot> = Bot;
  private readonly businessModel: Model<IBusiness> = Business;
  private readonly userModel: Model<IUser> = User;

  private readonly botService: BotService;
  private readonly conversationService: ConversationService;
  private readonly cacheService: CacheService;
  private readonly appointmentService: AppointmentService;
  private readonly emailService: MailgunEmailService;
  private readonly ticketService: TicketService;
  private readonly openai: OpenAI;

  constructor() {
    this.botService = BotService.getInstance();
    this.conversationService = ConversationService.getInstance();
    this.cacheService = CacheService.getInstance();
    this.appointmentService = AppointmentService.getInstance();
    this.emailService = MailgunEmailService.getInstance();
    this.ticketService = TicketService.getInstance();
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  static getInstance(): AgentService {
    if (!this.instance) {
      this.instance = new AgentService();
    }
    return this.instance;
  }

  async connect(authData: AuthData, agentId: string, sessionId: string) {
    const agent = await this.agentModel.findOne({
      _id: agentId,
      businessId: authData.userId,
    });
    if (!agent)
      return throwNotFoundError(
        "Error occured while connecting to because this agent is unknown. Ensure you provided a valid agent identifier."
      );

    // for (let i = 0; i < 30_000; i++) {
    //   console.log(i);
    // }

    let conversation: IConversation | null = null;
    try {
      conversation = await this.conversationService.getOrCreateConversation(
        sessionId,
        agentId,
        authData.userId
      );
    } catch (error) {}

    if (conversation?.messages.length === 0) {
      const newMessage = {
        role: RoleEnum.ASSISTANT,
        content: agent.welcomeMessage,
      };
      conversation.messages.push(newMessage);
      await conversation.save();
    }

    return {
      agent,
      chatHistory: conversation?.messages ?? [
        {
          role: RoleEnum.ASSISTANT,
          content: agent.welcomeMessage,
        },
      ],
    };
  }

  async ask(
    authData: AuthData,
    agentId: string,
    sessionId: string,
    data: AskAgentDto
  ) {
    return await this.botService.liveChat({
      botId: agentId,
      conversationId: sessionId,
      businessId: authData.userId.toString(),
      data,
      authData,
    });
  }

  async speechToText(
    authData: AuthData,
    audioFile: Express.Multer.File,
    agentId: string
  ) {
    // Get bot configuration
    let agent: IBot | null = await this._getAgentConfig(agentId, authData);
    if (!agent) {
      return throwUnprocessableEntityError("Unconfigured bot referenced");
    }

    const filePath = audioFile.path;
    const convertedPath = path.join(
      path.dirname(filePath),
      `${path.parse(filePath).name}.mp3`
    );

    try {
      // Convert the file from .webm to .mp3
      try {
        await AudioConverter.convertToMp3(filePath, convertedPath);
      } catch (error) {}

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(convertedPath),
        model: "whisper-1",
      });

      return { text: transcription.text };
    } catch (error) {
      return throwUnprocessableEntityError("Unable to transcribe audio");
    } finally {
      try {
        await fs.promises.unlink(audioFile.path);
      } catch (err: any) {}

      try {
        await fs.promises.unlink(convertedPath);
      } catch (err: any) {}
    }
  }

  private async _getAgentConfig(agentId: string, authData: AuthData) {
    let agent: IBot | null = await this.cacheService.get(agentId);
    if (!agent) {
      agent = await this.agentModel
        .findOne({
          _id: new Types.ObjectId(agentId),
          businessId: new Types.ObjectId(authData.userId),
        })
        .populate(["knowledgeBases", "productsSources"]);
    }
    return agent;
  }

  async bookAppointment(
    authData: AuthData,
    agentId: string,
    sessionId: string,
    data: BookingRequestDto
  ) {
    // Get bot configuration
    let agent: IBot | null = await this._getAgentConfig(agentId, authData);
    if (!agent) {
      return throwUnprocessableEntityError("Unconfigured bot referenced");
    }

    // Get current appointment context
    const { appointmentId, appointmentCacheKey } =
      await this.appointmentService.getOrCreateAppointmentContext(sessionId);

    // Convert local time in the given timezone to UTC
    const utcDate = fromZonedTime(data.dateTime, data.timezone);

    // Format UTC date and time parts
    const appointmentDate = format(utcDate, "yyyy-MM-dd"); // e.g. "2025-08-02"
    const appointmentTime = format(utcDate, "HH:mm"); // e.g. "00:30"
    const appointmentDateInCustomerTimezone = format(
      data.dateTime,
      "yyyy-MM-dd"
    );
    const appointmentTimeInCustomerTimezone = format(data.dateTime, "HH:mm");

    // Schedule an appointment
    const appointmentData = {
      _id: appointmentId,
      businessId: authData.userId,
      botId: agentId,
      providerId: agent?.meetingProviderId,
      conversationId: sessionId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      appointmentDateInCustomerTimezone,
      appointmentTimeInCustomerTimezone,
      appointmentDateInUTC: appointmentDate,
      appointmentTimeInUTC: appointmentTime,
      timezone: data.timezone,
      dateTimeInCustomerTimezone: data.dateTime,
      dateTimeInUTC: utcDate,
      status: AppointmentStatus.SCHEDULED,
    };

    let result = await this.appointmentService.bookAppointment(appointmentData);

    try {
      let owner = await this.userModel.findById(authData.userId);

      if (owner) {
        const businessInfo = await this.businessModel.findOne({
          businessId: owner.businessId,
        });

        await this.emailService.send({
          message: {
            to: result.customerEmail,
            subject: "Your appointment has been scheduled",
            text: `Your appointment has been scheduled for ${appointmentDateInCustomerTimezone} at ${appointmentTimeInCustomerTimezone} ${data.timezone} time.`,
          },
          template: "booking",
          locals: {
            appointmentDateInCustomerTimezone,
            appointmentTimeInCustomerTimezone,
            duration: result.duration ?? 30,
            timezone: result.timezone,
            appointmentId,
            business: {
              contactEmail: businessInfo?.contactEmail ?? owner.email,
              contactTel: businessInfo?.contactTel ?? owner.phone,
            },
          },
        });
      }
    } catch (error) {}

    const botResponse = await this.ask(authData, agentId, sessionId, {
      userQuery: `Booked an appointment to be held on ${appointmentDateInCustomerTimezone} at ${appointmentTimeInCustomerTimezone} ${data.timezone} time.`,
      action: UserActions.COMPLETE_APPOINTMENT_FORM,
    });

    try {
    } catch (error) {
      await this.cacheService.delete(appointmentCacheKey);
    }

    return {
      chatData: [
        {
          role: RoleEnum.USER,
          content: `Booked an appointment to be held on ${appointmentDateInCustomerTimezone} at ${appointmentTimeInCustomerTimezone} ${data.timezone} time.`,
        },
        botResponse.data,
      ],
    };
  }

  async submitTicket(
    authData: AuthData,
    agentId: string,
    sessionId: string,
    data: SubmitTicketDto
  ) {
    // Get bot configuration
    let agent: IBot | null = await this._getAgentConfig(agentId, authData);
    if (!agent) {
      return throwUnprocessableEntityError("Unconfigured bot referenced");
    }

    const ticketData = {
      businessId: authData.userId,
      sessionId,
      botId: agentId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      message: data.message,
    };

    await this.ticketService.openOrUpdateTicket(ticketData);

    const botResponse = await this.ask(authData, agentId, sessionId, {
      userQuery: `Submitted a ticket for ${data.customerName} using email ${data.customerEmail}.`,
      action: UserActions.COMPLETE_ESCALATION_FORM,
    });

    return {
      chatData: [
        {
          role: RoleEnum.USER,
          content: `Submitted a ticket for ${data.customerName} using email ${data.customerEmail}.`,
        },
        botResponse.data,
      ],
    };
  }
}
