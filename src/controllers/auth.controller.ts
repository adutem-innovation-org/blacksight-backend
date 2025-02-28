import {
  ChangePasswordDto,
  CheckUserDto,
  CreateAccountDto,
  CreateAuthDto,
  GoogleLoginDto,
  LoginDto,
  NotificationDto,
  ResetPasswordDto,
  SavePushTokenDto,
  VerifyEmailDto,
} from "@/decorators";
import { UserTypes } from "@/enums";
import { sendSuccessResponse, throwForbiddenError } from "@/helpers";
import { AuthService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

interface GenericReq<T> extends Request<any, any, T> {}

export class AuthController {
  private readonly authService: AuthService;
  private static instance: AuthController;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  static getInstance(): AuthController {
    if (!this.instance) {
      this.instance = new AuthController();
    }
    return this.instance;
  }

  adminLogin = async (req: GenericReq<LoginDto>, res: Response) => {
    const data = await this.authService.loginAdmin(req.body);
    return sendSuccessResponse(res, data);
  };

  userForgotPassword = async (
    req: GenericReq<{ email: string }>,
    res: Response
  ) => {
    const data = await this.authService.sendPasswordReset(
      req.body.email,
      UserTypes.USER
    );
    return sendSuccessResponse(res, data);
  };

  forgotPassword = async (
    req: GenericReq<{ email: string }>,
    res: Response
  ) => {
    const data = await this.authService.sendPasswordReset(
      req.body.email,
      UserTypes.ADMIN
    );
    return sendSuccessResponse(res, data);
  };

  session = async (req: Request, res: Response) => {
    const data = await this.authService.session(req.authData!);
    return sendSuccessResponse(res, data);
  };

  changePassword = async (
    req: GenericReq<ChangePasswordDto>,
    res: Response
  ) => {
    const data = await this.authService.changePassword(req.authData!, req.body);
    return sendSuccessResponse(res, data);
  };

  adminResetPassword = async (
    req: GenericReq<ResetPasswordDto>,
    res: Response
  ) => {
    const data = await this.authService.resetPassword(
      req.body,
      UserTypes.ADMIN
    );
    return sendSuccessResponse(res, data);
  };

  userResetPassword = async (
    req: GenericReq<ResetPasswordDto>,
    res: Response
  ) => {
    const data = await this.authService.resetPassword(req.body, UserTypes.USER);
    return sendSuccessResponse(res, data);
  };

  seedAdmin = async (req: Request, res: Response) => {
    const data = await this.authService.seedAdmin();
    return sendSuccessResponse(res, data);
  };

  sendVerificationOTP = async (req: Request, res: Response) => {
    const data = await this.authService.sendVerificationOTP(req.authData!);
    return sendSuccessResponse(res, data);
  };

  verifyEmail = async (req: GenericReq<VerifyEmailDto>, res: Response) => {
    const data = await this.authService.verifyEmail(req.body, req.authData!);
    return sendSuccessResponse(res, data);
  };

  userLogin = async (req: GenericReq<LoginDto>, res: Response) => {
    const data = await this.authService.loginUser(req.body);
    return sendSuccessResponse(res, data);
  };

  register = async (req: GenericReq<CreateAccountDto>, res: Response) => {
    const data = await this.authService.register(req.body);
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  logout = async (req: Request, res: Response) => {
    await this.authService.expireSession(req.authData?.userId!);
    return sendSuccessResponse(res, {}, StatusCodes.NO_CONTENT);
  };

  getProfile = async (req: Request, res: Response) => {
    const data = await this.authService.session(req.authData!);
    return sendSuccessResponse(res, data);
  };

  deleteAccount = async (req: Request, res: Response) => {
    const data = await this.authService.deleteAccount(req.authData!);
    return sendSuccessResponse(res, data);
  };

  getUsers = async (req: Request, res: Response) => {
    const data = await this.authService.getUsers(req.query);
    return sendSuccessResponse(res, data);
  };

  getAdmins = async (req: Request, res: Response) => {
    if (!req.authData?.isSuperAdmin) {
      throwForbiddenError("You are not allowed to perform this action");
    }
    const data = await this.authService.getAdmins(req.query);
    return sendSuccessResponse(res, data);
  };

  createAdmin = async (req: GenericReq<CreateAuthDto>, res: Response) => {
    const data = await this.authService.createAdmin(req.body, req.authData!);
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  googleLogin = async (req: GenericReq<GoogleLoginDto>, res: Response) => {
    const data = await this.authService.googleLogin(req.body);
    return sendSuccessResponse(res, data, StatusCodes.CREATED);
  };

  savePushToken = async (req: GenericReq<SavePushTokenDto>, res: Response) => {
    const data = await this.authService.savePushToken(req.authData!, req.body);
    return sendSuccessResponse(res, data);
  };

  sendNotification = async (
    req: GenericReq<NotificationDto>,
    res: Response
  ) => {
    const data = await this.authService.sendNotification(req.body);
    return sendSuccessResponse(res, {}, StatusCodes.NO_CONTENT);
  };
}
