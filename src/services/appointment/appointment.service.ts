import { AppointmentStatus, UserTypes } from "@/enums";
import { throwForbiddenError, throwNotFoundError } from "@/helpers";
import { AuthData, ScheduleAppointmentBody } from "@/interfaces";
import { Appointment, IAppointment } from "@/models";
import { PaginationService } from "@/utils";
import { Model, Types } from "mongoose";

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
