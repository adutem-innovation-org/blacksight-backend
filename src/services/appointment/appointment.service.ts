import {
  AppointmentParam,
  AppointmentStatus,
  Events,
  TTL,
  UserTypes,
} from "@/enums";
import {
  logJsonError,
  throwForbiddenError,
  throwNotFoundError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { AuthData, ScheduleAppointmentBody } from "@/interfaces";
import { Appointment, IAppointment } from "@/models";
import { CacheService, eventEmitter, PaginationService } from "@/utils";
import { Model, Types } from "mongoose";
import {
  startOfDay,
  subDays,
  format,
  endOfDay,
  parseISO,
  differenceInMilliseconds,
} from "date-fns";
import EventEmitter2 from "eventemitter2";
import { Logger } from "winston";
import { logger } from "@/logging";
import { BookingEventService } from "./booking-events.service";

export class AppointmentService {
  private static instance: AppointmentService;
  private static jsonErrorLogger = logJsonError;

  private readonly eventEmitter: EventEmitter2 = eventEmitter;
  private readonly logger: Logger = logger;

  private readonly appointmentModel: Model<IAppointment> = Appointment;
  private readonly paginationService: PaginationService<IAppointment>;
  private readonly cacheService: CacheService;

  constructor() {
    this.paginationService = new PaginationService(this.appointmentModel);
    this.cacheService = CacheService.getInstance();
    BookingEventService.getInstance();
    this._setupEventListeners();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new AppointmentService();
    }
    return this.instance;
  }

  private _setupEventListeners() {
    this.eventEmitter.on(Events.INIT_APPOINTMENT, (payload) =>
      this._initAppointment(payload)
    );

    // this.eventEmitter.on(Events.SET_APPOINTMENT_PARAM, (payload) =>
    //   this._setAppointmentParam(payload)
    // );
  }

  private async _initAppointment(payload: {
    businessId: string;
    conversationId: string;
    appointmentId: string;
    botId: string;
    providerId?: string;
    values: Record<string, any>;
  }) {
    let valuesToSet: Record<string, any> = {};
    // const values = payload.values;
    const { botId, conversationId, appointmentId, businessId, values } =
      payload;

    if (values.email) {
      valuesToSet["customerEmail"] = values.email;
    }

    if (values.name) {
      valuesToSet["customerName"] = values.name;
    }

    if (values.phone) {
      valuesToSet["customerPhone"] = values.phone;
    }

    if (values.date) {
      valuesToSet["appointmentDate"] = values.date;
    }

    if (values.time) {
      valuesToSet["appointmentTime"] = values.time;
    }

    if (values.summary) {
      valuesToSet["summary"] = values.summary;
    }

    try {
      await this.appointmentModel.findByIdAndUpdate(
        appointmentId,
        {
          businessId,
          conversationId,
          botId,
          providerId: payload.providerId,
          ...valuesToSet,
        },
        { upsert: true }
      );
    } catch (error) {
      this.logger.error("Unable to initilize appointment");
      AppointmentService.jsonErrorLogger(error);
    }
  }

  // private async _setAppointmentParam(payload: {
  //   param: AppointmentParam;
  //   value: any;
  //   conversationId: string;
  //   businessId: string;
  //   appointmentId: string;
  // }) {
  //   try {
  //     const { param, value, conversationId, businessId, appointmentId } =
  //       payload;

  //     console.log("Data >> ", payload);

  //     if (!appointmentId)
  //       return throwUnprocessableEntityError(
  //         "Cannot set appointment with missing id"
  //       );

  //     let valueToSet: Record<string, any> = {
  //       businessId,
  //       conversationId,
  //     };

  //     switch (param) {
  //       case AppointmentParam.DATE:
  //         valueToSet["appointmentDate"] = value.date;
  //         if (value.time) {
  //           valueToSet["appointmentTime"] = value.time;
  //         }
  //         break;
  //       case AppointmentParam.TIME:
  //         valueToSet["appointmentTime"] = value;
  //         break;
  //       case AppointmentParam.EMAIL:
  //         valueToSet["customerEmail"] = value;
  //         break;
  //       case AppointmentParam.NAME:
  //         valueToSet["customerName"] = value;
  //         break;
  //       case AppointmentParam.PHONE:
  //         valueToSet["customerPhone"] = value;
  //         break;
  //       case AppointmentParam.DATE_TIME:
  //         if (value.date) {
  //           valueToSet["appointmentDate"] = value.date;
  //         }
  //         if (value.time) {
  //           valueToSet["appointmentTime"] = value.time;
  //         }
  //         break;
  //       default:
  //         break;
  //     }

  //     console.log("Appointment data to be set >> ", valueToSet);

  //     let appointment = await this.appointmentModel.findByIdAndUpdate(
  //       appointmentId,
  //       valueToSet,
  //       { new: true, upsert: true }
  //     );

  //     // Updated condition to include name and phone for complete appointment
  //     if (
  //       appointment.appointmentDate &&
  //       appointment.appointmentTime &&
  //       appointment.customerEmail &&
  //       appointment.customerName &&
  //       appointment.customerPhone
  //     ) {
  //       appointment.status = AppointmentStatus.SCHEDULED;
  //       await appointment.save();
  //     }
  //   } catch (error) {
  //     AppointmentService.jsonErrorLogger(error);
  //   }
  // }

  /**
   * Create a session appointment context
   * @param conversationId string
   * @returns
   */
  // Session id can be used interchangably with conversationId
  async getOrCreateAppointmentContext(
    conversationId: string
  ): Promise<{ appointmentId: string; appointmentCacheKey: string }> {
    // Get current appointment context
    const appointmentCacheKey = `appointment-id-${conversationId}`;
    let appointmentId = (await this.cacheService.get(
      appointmentCacheKey
    )) as string;
    if (!appointmentId) {
      appointmentId = new Types.ObjectId().toString();
      await this.cacheService.set(
        appointmentCacheKey,
        appointmentId,
        TTL.IN_30_MINUTES
      );
    }
    return { appointmentId, appointmentCacheKey };
  }

  async getContextAppointment(appointmentId: string) {
    return this.getConversationAppointment(appointmentId);
  }

  async constructAppoinmentAsContext(appointmentId: string) {
    // Get the appointment data
    const result = await this.getConversationAppointment(appointmentId);

    const currentAppointmentData =
      result?.isRecent && result.appointment
        ? `Current appointment data collected: ${JSON.stringify(
            result.appointment
          )}`
        : "Current appointment data collected: None";

    return currentAppointmentData;
  }

  async analytics(auth: AuthData) {
    let query: Record<string, any> = {};
    if (auth.userType === UserTypes.USER) {
      query = { businessId: new Types.ObjectId(auth.userId) };
    }

    const statuses: string[] = [
      ...Object.values(AppointmentStatus).filter(
        (status) => status !== AppointmentStatus.CONFIRMED
      ),
      "total",
    ];

    const results = await Promise.allSettled(
      statuses.map((status) =>
        status !== "total"
          ? this.appointmentModel.countDocuments({ ...query, status })
          : this.appointmentModel.countDocuments({ ...query })
      )
    );

    const analytics: Record<string, number> = {};
    statuses.forEach((status, i) => {
      const key = `${status.toLowerCase()}Appointments`;
      analytics[key] = results[i].status === "fulfilled" ? results[i].value : 0;
    });

    return { data: analytics };
  }

  async bookingStats(auth: AuthData) {
    // Get today's date.
    // Our stat range is today and 6 days prior
    const today = startOfDay(new Date()); // Set time to 00:00:00
    const startDate = subDays(today, 6); // 6 days before today
    const midnightToday = endOfDay(new Date());

    // ✅ Construct query
    const query: Record<string, any> = {};
    query["status"] = AppointmentStatus.SCHEDULED;

    if (auth.userId === UserTypes.USER) {
      query["businessId"] = new Types.ObjectId(auth.userId);
    }

    // ✅ Get all scheduled appointments in the range
    const appointments = await this.appointmentModel.find({
      ...query,
      createdAt: {
        $gte: startDate,
        $lte: midnightToday,
      },
    });

    // ✅ Create an array to hold count per day;
    const stats: Record<string, any> = {};

    // ✅ Initialize with 0s for each day
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const day = format(date, "EEE");
      stats[day] = { day, bookings: 0 }; // e.g.{ Mon: {day: "Mon", bookings: 0}}
    }

    // ✅ Count appointments per day
    for (const appt of appointments) {
      const day = format(startOfDay(appt.createdAt), "EEE");
      if (stats[day] !== undefined) {
        stats[day]["bookings"]++;
      }
    }

    // ✅ Return an array of object {day: "Mon" | "Tue" etc, bookings: Number of appointment created in each day}
    return { data: Object.values(stats) };
  }

  /**
   * @deprecated No longer used
   * @param data
   */
  async scheduleAppointment(data: ScheduleAppointmentBody) {
    const {
      businessId,
      conversationId,
      appointmentDate,
      appointmentTime,
      meetingLink,
    } = data;

    const status = data.status || AppointmentStatus.PENDING;

    await this.appointmentModel.findOneAndUpdate(
      {
        businessId: new Types.ObjectId(businessId),
        conversationId: new Types.ObjectId(conversationId),
      },
      {
        $set: {
          appointmentDate,
          appointmentTime,
          meetingLink,
          status,
          businessId: new Types.ObjectId(businessId),
          conversationId: new Types.ObjectId(conversationId),
        },
      },
      { upsert: true, new: true }
    );
  }

  async bookAppointment(data: any) {
    return await this.appointmentModel.create(data);
  }

  async getAllAppointments(auth: AuthData) {
    let query: Record<string, any> = {};
    if (auth.userType === UserTypes.USER) {
      query.businessId = new Types.ObjectId(auth.userId);
      // query.status = { $nin: [AppointmentStatus.PENDING] };
    }
    return await this.paginationService.paginate(
      { query, sort: { appointmentDate: -1, appointmentTime: -1 } },
      []
    );
  }

  async updateStatus(auth: AuthData, id: string, status: AppointmentStatus) {
    const appointment = await this.appointmentModel.findOneAndUpdate(
      {
        businessId: new Types.ObjectId(auth.userId),
        _id: new Types.ObjectId(id),
      },
      { status },
      { new: true }
    );

    if (!appointment) return throwNotFoundError("Appoinment not found");

    return { appointment, message: "Appointment updated successfully" };
  }

  async getAppointment(auth: AuthData, id: string) {
    const appointment = await this.appointmentModel.findById(id);
    if (!appointment) return throwNotFoundError("Appointment not found");
    if (
      auth.userType === UserTypes.USER &&
      appointment.businessId.toString() !== auth.userId.toString()
    )
      return throwForbiddenError("You are not allowed to access this resource");
    return { appointment };
  }

  async getConversationAppointment(appointmentId: string) {
    try {
      // const appointment = await this.appointmentModel.findOne({
      //   conversationId,
      // });
      // if (!appointment) return null;
      // const isRecent = this._isWithinLast(
      //   appointment?.createdAt,
      //   2 * 60 * 60 * 1000
      // ); // 2 hourse
      // return { appointment, isRecent };
      const appointment = await this.appointmentModel.findById(appointmentId);
      if (!appointment) return null;
      return { appointment, isRecent: true };
    } catch (error) {
      return null;
    }
  }

  _isWithinLast(date: string | Date, durationMs: number): boolean {
    const parsedDate = typeof date === "string" ? parseISO(date) : date;
    return differenceInMilliseconds(new Date(), parsedDate) <= durationMs;
  }

  async deleteAppointment(auth: AuthData, id: string) {
    const appointment = await this.appointmentModel.findOneAndDelete({
      businessId: new Types.ObjectId(auth.userId),
      _id: new Types.ObjectId(id),
    });
    if (!appointment) return throwNotFoundError("Appointment not found");
    return { appointment, message: "Appointment deleted successfully" };
  }
}
