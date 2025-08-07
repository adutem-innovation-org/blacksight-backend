import {
  CreatePaymentFileDto,
  UpdatePaymentFileDto,
  UpdateBCPDto,
} from "@/decorators";
import { sendSuccessResponse, throwBadRequestError } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { PaymentTrackerService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export class PaymentTrackerController {
  private static instance: PaymentTrackerController;

  private readonly paymentTrackerService: PaymentTrackerService;

  constructor() {
    this.paymentTrackerService = PaymentTrackerService.getInstance();
  }

  static getInstance(): PaymentTrackerController {
    if (!this.instance) {
      this.instance = new PaymentTrackerController();
    }
    return this.instance;
  }

  uploadPaymentFile = async (
    req: GenericReq<CreatePaymentFileDto>,
    res: Response
  ) => {
    if (!req.file) return throwBadRequestError("No file uploaded");

    const data = await this.paymentTrackerService.uploadPaymentFile(
      req.authData!,
      req.body,
      req.file!
    );
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  getAllPaymentFiles = async (req: Request, res: Response) => {
    const data = await this.paymentTrackerService.getAllPaymentFiles(
      req.authData!
    );
    return sendSuccessResponse(res, data);
  };

  getPaymentFileById = async (req: Request, res: Response) => {
    const data = await this.paymentTrackerService.getPaymentFileById(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  deletePaymentFile = async (req: Request, res: Response) => {
    const data = await this.paymentTrackerService.deletePaymentFile(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  updatePaymentFile = async (
    req: GenericReq<UpdatePaymentFileDto>,
    res: Response
  ) => {
    if (!req.file) return throwBadRequestError("No file uploaded");

    const data = await this.paymentTrackerService.updatePaymentFile(
      req.authData!,
      req.params.id,
      req.body,
      req.file!
    );
    return sendSuccessResponse(res, data);
  };

  getPaymentFileBCPs = async (req: Request, res: Response) => {
    const data = await this.paymentTrackerService.getPaymentFileBCPs(
      req.authData!,
      req.params.fileId
    );
    return sendSuccessResponse(res, data);
  };

  getBCPById = async (req: Request, res: Response) => {
    const data = await this.paymentTrackerService.getBCPById(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };

  updateBCP = async (req: GenericReq<UpdateBCPDto>, res: Response) => {
    const data = await this.paymentTrackerService.updateBCP(
      req.authData!,
      req.params.id,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  deleteBCP = async (req: Request, res: Response) => {
    const data = await this.paymentTrackerService.deleteBCP(
      req.authData!,
      req.params.id
    );
    return sendSuccessResponse(res, data);
  };
}
