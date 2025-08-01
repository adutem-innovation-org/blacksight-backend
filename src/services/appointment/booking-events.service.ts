import { logJsonError, throwUnprocessableEntityError } from "@/helpers";
import {
  Appointment,
  IAppointment,
  ICalendarProvider,
  CalendarProvider,
} from "@/models";
import { Model } from "mongoose";
import { CalendarService } from "../calendar";
import { Logger } from "winston";
import { logger } from "@/logging";
import cron from "node-cron";
import { CronExpression, CalendarProvidersEnum } from "@/enums";
import { PaginationService } from "@/utils";
import { addMinutes } from "date-fns";

export class BookingEventService {
  private static instance: BookingEventService;
  private static logJsonError = logJsonError;
  private static logger: Logger = logger;

  // Models
  private readonly meetingProviderModel: Model<ICalendarProvider> =
    CalendarProvider;
  private readonly appointmentModel: Model<IAppointment> = Appointment;

  // Services
  private readonly meetingProviderService: CalendarService;
  private readonly appointmentPagination: PaginationService<IAppointment>;

  constructor() {
    this.meetingProviderService = CalendarService.getInstance();
    this.appointmentPagination = new PaginationService(this.appointmentModel);
    this._setupCronJobs();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new BookingEventService();
    }
    return this.instance;
  }

  private _setupCronJobs() {
    cron.schedule(CronExpression.EVERY_5_MINUTES, () =>
      this.scheduleMeetings()
    );
  }

  private async scheduleMeetings(page: number = 1) {
    BookingEventService.logger.info(
      `Running cron job scheduleMeetings:: ${page}`
    );

    const resp = await this.appointmentPagination.paginate<IAppointment>(
      {
        page,
        limit: 10,
        query: {
          providerId: { $exists: true },
          scheduledByProvider: false,
          meetingLink: { $exists: false },
        },
        sort: { createdAt: -1 },
      },
      []
    );

    for (const appointment of resp.data) {
      try {
        const provider = await this.meetingProviderModel.findById(
          appointment.providerId
        );
        if (!provider || !provider.accessToken || !provider.refreshToken)
          return BookingEventService.logger.debug(
            "Schedule meeting failed >> Provider already disconnected"
          );
        switch (provider.provider) {
          case CalendarProvidersEnum.GOOGLE:
            await this.bookGoogleMeet(appointment);
            break;
          default:
            BookingEventService.logger.error(
              `Unsupported booking provider >> ${provider.provider}`
            );
            break;
        }
      } catch (error) {
        BookingEventService.logJsonError(error);
      }
    }

    if (resp.meta.pages > page) {
      await this.scheduleMeetings(page + 1);
    }
  }

  async bookGoogleMeet(appointment: IAppointment) {
    BookingEventService.logger.info(
      `Scheduling meeting for >> ${appointment._id}`
    );
    try {
      if (!appointment.providerId || !appointment.provider)
        return throwUnprocessableEntityError(
          "Appointment provider not specified"
        );

      if (
        !appointment.customerEmail ||
        !appointment.appointmentTime ||
        !appointment.appointmentDate
      ) {
        return;
      }

      let startTime = appointment?.dateTime?.toISOString();
      if (!startTime) {
        const date = appointment.appointmentDate; // e.g. "2025-06-06"
        let time = appointment.appointmentTime; // e.g. "17:00" or "17:00:00+04:00"

        // Strip timezone offset if present
        time = time.split("+")[0].split("-")[0]; // removes "+04:00" or "-03:00" etc.

        // Combine date and time as a local time string
        const localDateTimeString = `${date}T${time}`;

        // Parse as local time
        const localDate = new Date(localDateTimeString);

        // Convert to UTC ISO string
        startTime = localDate.toISOString();
      }

      let endTime = addMinutes(
        new Date(startTime),
        appointment?.duration ?? 30
      ).toISOString();

      const provider = await this.meetingProviderModel.findById(
        appointment.providerId
      );

      if (!provider)
        return throwUnprocessableEntityError("Booking provider not found");

      const resp = await this.meetingProviderService.scheduleGoogleMeeting({
        provider,
        customerEmail: appointment.customerEmail,
        startTime,
        endTime,
        summary: appointment.summary ?? "Appointment booking",
      });

      await this.appointmentModel.findByIdAndUpdate(appointment._id, {
        meetingLink: resp.meetingLink,
        scheduledByProvider: !!resp.meetingLink,
        metadata: resp.metadata,
      });
    } catch (error) {
      console.log(error);
      BookingEventService.logger.error("Unable to book google meeting");
      BookingEventService.logJsonError(error);
    }
  }
}
