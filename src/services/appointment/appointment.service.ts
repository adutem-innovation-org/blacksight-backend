import { AppointmentStatus, UserTypes } from "@/enums";
import { throwForbiddenError, throwNotFoundError } from "@/helpers";
import { AuthData, ScheduleAppointmentBody } from "@/interfaces";
import { Appointment, IAppointment } from "@/models";
import { PaginationService } from "@/utils";
import { Model, Types } from "mongoose";
import { startOfDay, subDays, format, endOfDay } from "date-fns";

export class AppointmentService {
  private static instance: AppointmentService;
  private readonly appointmentModel: Model<IAppointment> = Appointment;
  private readonly paginationService: PaginationService<IAppointment>;

  constructor() {
    this.paginationService = new PaginationService(this.appointmentModel);
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new AppointmentService();
    }
    return this.instance;
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

  async getAllAppointments(auth: AuthData) {
    let query: Record<string, any> = {};
    if (auth.userType === UserTypes.USER) {
      query.businessId = new Types.ObjectId(auth.userId);
      query.status = { $nin: [AppointmentStatus.PENDING] };
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

  async deleteAppointment(auth: AuthData, id: string) {
    const appointment = await this.appointmentModel.findOneAndDelete({
      businessId: new Types.ObjectId(auth.userId),
      _id: new Types.ObjectId(id),
    });
    if (!appointment) return throwNotFoundError("Appointment not found");
    return { appointment, message: "Appointment deleted successfully" };
  }
}
