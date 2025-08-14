import { UpdateAppointmentStatusDto } from "@/decorators";
import { AppointmentStatus } from "@/enums";
import { sendSuccessResponse } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { AppointmentService } from "@/services";
import { Request, Response } from "express";

export class AppointmentController {
  private static instance: AppointmentController;

  private readonly appointmentService: AppointmentService;

  constructor() {
    this.appointmentService = AppointmentService.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new AppointmentController();
    }
    return this.instance;
  }

  getAnalytics = async (req: Request, res: Response) => {
    const data = await this.appointmentService.analytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getAllAppointments = async (req: Request, res: Response) => {
    const data = await this.appointmentService.getAllAppointments(
      req.authData!
    );
    return sendSuccessResponse(res, data);
  };

  updateAppointmentStatus = async (
    req: GenericReq<UpdateAppointmentStatusDto>,
    res: Response
  ) => {
    const data = await this.appointmentService.updateStatus(
      req.authData!,
      req.params.id,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  getAppointment = async (req: Request, res: Response) => {
    const data = await this.appointmentService.getAppointment(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  deleteAppointment = async (req: Request, res: Response) => {
    const data = await this.appointmentService.deleteAppointment(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };
}
