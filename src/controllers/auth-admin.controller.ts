import { LiftSuspensionDto, SuspendUserDto } from "@/decorators";
import { sendSuccessResponse, throwForbiddenError } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { AuthAdminService } from "@/services";
import { Request, Response } from "express";

export class AuthAdminController {
  private static instance: AuthAdminController;

  private readonly authAdminService: AuthAdminService;

  constructor() {
    this.authAdminService = AuthAdminService.getInstance();
  }

  static getInstance(): AuthAdminController {
    if (!this.instance) {
      this.instance = new AuthAdminController();
    }
    return this.instance;
  }

  getUsers = async (req: Request, res: Response) => {
    const data = await this.authAdminService.getUsers(req.query);
    return sendSuccessResponse(res, data);
  };

  getAdmins = async (req: Request, res: Response) => {
    if (!req.authData?.isSuperAdmin)
      throwForbiddenError("You are not allowed to perform this action");
    const data = await this.authAdminService.getAdmins(req.query);
    return sendSuccessResponse(res, data);
  };

  getUserAnalytics = async (req: Request, res: Response) => {
    const data = await this.authAdminService.getUsersAnalytics(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getSuspensions = async (req: Request, res: Response) => {
    const data = await this.authAdminService.getAllSuspensions(req.query);
    return sendSuccessResponse(res, data);
  };

  suspendUser = async (req: GenericReq<SuspendUserDto>, res: Response) => {
    const data = await this.authAdminService.suspendUser(
      req.authData!,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  liftUserSuspension = async (
    req: GenericReq<LiftSuspensionDto>,
    res: Response
  ) => {
    const data = await this.authAdminService.liftUserSuspension(
      req.authData!,
      req.body
    );
    return sendSuccessResponse(res, data);
  };
}
