import { config } from "@/config";
import { Events, SocialOptionEnum, TTL, UserTypes } from "@/enums";
import { AuthData } from "@/interfaces";
import { Admin, IAdmin, IMerchant, IUser, Merchant, User } from "@/models";
import {
  CacheService,
  eventEmitter,
  MailgunEmailService,
  PaginationService,
  StorageService,
} from "@/utils";
import { Model, Types } from "mongoose";
import { v4 } from "uuid";
import { JwtService } from "./jwt.service";
import {
  ChangePasswordDto,
  CheckUserDto,
  CreateAuthDto,
  GetUserAltDto,
  GoogleLoginDto,
  LoginDto,
  ResetPasswordDto,
  VerifyEmailDto,
  SavePushTokenDto,
  CreateAccountDto,
  NotificationDto,
  GetUserPasswordDto,
  SetupPasswordDto,
  UpdateAddressDto,
  UpdateProfileDto,
  UpdateProfileImageDto,
} from "@/decorators";
import {
  logJsonError,
  throwBadRequestError,
  throwConflictError,
  throwForbiddenError,
  throwNotFoundError,
  throwUnauthorizedError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { randomUUID, webcrypto } from "crypto";
import EventEmitter2 from "eventemitter2";
import { ActivityService } from "../activity";
import { ActivityEvents } from "@/events";
import { Logger } from "winston";
import { logger } from "@/logging";

export class AuthService {
  private static instance: AuthService;
  private static readonly logger: Logger = logger;
  private static readonly logJsonError = logJsonError;

  // Model
  private readonly userModel: Model<IUser> = User;
  private readonly adminModel: Model<IAdmin> = Admin;
  private readonly merchantModel: Model<IMerchant> = Merchant;

  // Services
  private readonly cacheService: CacheService;
  private readonly jwtService: JwtService;
  private readonly emailService: MailgunEmailService;
  private readonly storageService: StorageService;

  // Pagination
  private readonly userPagination: PaginationService<IUser>;
  private readonly adminPagination: PaginationService<IAdmin>;

  // Others
  private readonly eventEmitter: EventEmitter2 = eventEmitter;

  constructor() {
    this.cacheService = CacheService.getInstance();
    this.jwtService = JwtService.getInstance();
    this.emailService = MailgunEmailService.getInstance();
    this.storageService = StorageService.getInstance();
    this.userPagination = new PaginationService(this.userModel);
    this.adminPagination = new PaginationService(this.adminModel);
  }

  /**
   * Gets an instance of the AuthService
   * @returns {AuthService}
   */
  static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService();
    }
    return this.instance;
  }

  /**
   * A key used to map auth session id to the user id
   * @param {string} userId
   * @returns {string}
   */
  sessionKeyMap(userId: string): string {
    return `auth-session-map-${userId}`;
  }

  /**
   * Expires existing session
   * @param {string} userId
   * @returns {void}
   */
  async expireSession(userId: string): Promise<void> {
    // fetch any existing session for user
    const existingAuthKey = await this.cacheService.get<string>(
      this.sessionKeyMap(userId)
    );
    // delete any exist session
    if (existingAuthKey) {
      await this.cacheService.delete(existingAuthKey);
    }
  }

  /**
   * Refresh a user's session when there is change in the user's data
   * @param user {IUser}
   * @param userType {UserTypes}
   * @param authId {string}
   */
  async refreshSession(user: IUser, userType: UserTypes, authId: string) {
    const authData = await this.cacheService.get<AuthData>(authId);
    // set new session details on cache
    const { _id: userId, email, firstName, lastName, isSuperAdmin } = user;
    await this.cacheService.set(
      authId,
      {
        userId,
        email,
        firstName,
        lastName,
        userType,
        isSuperAdmin,
        exp: authData?.exp,
        access: [],
        authId,
      },
      config.jwt.ttl
    );

    await this.cacheService.set<string>(this.sessionKeyMap(user.id), authId);
  }

  /**
   * Sets a new session and expires existing one
   * @param user {IUser}
   * @param userType {UserType}
   * @param expire {number | null}
   * @returns {Promise<object>}
   */
  async setSession(
    user: IUser,
    userType: UserTypes,
    expire: number | null
  ): Promise<{ user: AuthData; token: string }> {
    const authId = `auth-id-${v4()}`;
    await this.expireSession(user.id);
    const ex = expire || config.jwt.ttl;
    const { _id: userId, email, firstName, lastName, isSuperAdmin } = user;
    await this.cacheService.set(
      authId,
      {
        userId,
        email,
        firstName,
        lastName,
        userType,
        isSuperAdmin,
        exp: Date.now() / 1000 + ex,
        access: [],
        authId,
      },
      ex
    );

    await this.cacheService.set<string>(this.sessionKeyMap(user.id), authId);

    const u = user.toObject();
    const { hash, salt, deviceId, pushToken, ...rest } = u;

    return {
      user: rest,
      token: this.jwtService.generateToken(authId, ex),
    };
  }

  /**
   *
   * @param loginDto
   * @returns {Promise<object>}
   */
  async loginAdmin(loginDto: LoginDto): Promise<object> {
    const user = await this.adminModel.findOne({
      email: loginDto.email.toLowerCase(),
    });
    console.log(user);
    // If user could not be found in email
    if (!user) return throwUnauthorizedError("Invalid email or password");

    // If the input password is invalid
    const validPassword = await user.validatePassword(loginDto.password);

    if (!validPassword)
      return throwUnauthorizedError("Invalid email or password");

    // If the account is inactive
    if (!user.isActive)
      return throwUnprocessableEntityError("Your account is inactive");

    user.lastLogin = new Date();
    await user.save();
    return await this.setSession(user, UserTypes.ADMIN, null);
  }

  async sendPasswordReset(
    email: string,
    userType: UserTypes = UserTypes.ADMIN
  ) {
    let user;
    switch (userType) {
      case UserTypes.ADMIN:
        user = await this.adminModel.findOne({ email: email.toLowerCase() });
        break;
      case UserTypes.USER:
        user = await this.userModel.findOne({ email: email.toLowerCase() });
        break;
      default:
        user = await this.userModel.findOne({ email: email.toLowerCase() });
    }

    if (!user)
      return throwNotFoundError(
        "This email is not registered. Please check or sign up"
      );

    const otp = this.generateOTP();

    this.cacheService.set(`${email}-${userType}-otp`, otp, TTL.IN_10_MINUTES);

    await this.emailService.send({
      message: {
        to: email,
        subject: "Reset your password",
        // text: `Please use the OTP below to reset your password \m${otp}`,
      },
      template: "reset-password",
      locals: {
        otp,
        firstName: user.firstName,
      },
    });
    // await this.emailService.render({
    //   message: {
    //     to: email,
    //     subject: "Reset your password",
    //   },
    //   template: "reset-password/html",
    //   locals: {
    //     otp,
    //     firstName: user.firstName,
    //   },
    // });

    return {
      message: `An OTP ha been sent to ${email}, please get code to reset password`,
    };
  }

  /**
   * Returns a string f length 6
   * @returns {string}
   */
  generateOTP(): string {
    return webcrypto.getRandomValues(new Uint32Array(1)).toString().slice(0, 6);
  }

  /**
   *
   * @param body {LoginDto}
   * @returns {Promise<object>}
   */
  async loginUser(body: LoginDto) {
    const email = body.email.toLowerCase();
    let user = await this.userModel.findOne({ email }).exec();

    if (!user)
      return throwUnauthorizedError(`Invalid account, please try again`);

    const isValidPassword = await user.validatePassword(body.password);

    if (!isValidPassword)
      return throwUnauthorizedError("Invalid email or password");

    user.lastLogin = new Date();

    if (!user?.businessId) {
      user.businessId = randomUUID();
    }

    await user.save();

    const session = await this.setSession(user, UserTypes.USER, null);

    if (!user.isEmailVerified) {
      this.sendVerificationOTP(session.user);
    }

    this.eventEmitter.emit(ActivityEvents.USER_LOGIN, {
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return session;
  }

  async register(body: CreateAccountDto) {
    let user = await this.userModel
      .findOne({ email: body.email.toLowerCase() })
      .exec();

    if (user) {
      return throwConflictError("Account with email exists");
    }

    user = await this.userModel.create(body);

    await user.setPassword(body.password);
    user.userType = UserTypes.USER;

    user.lastLogin = new Date();

    await user.save();

    const session = await this.setSession(user, UserTypes.USER, null);

    this.sendVerificationOTP(session.user);

    this.eventEmitter.emit(ActivityEvents.USER_REGISTERED, {
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return session;
  }

  async verifyEmail(body: VerifyEmailDto, auth: AuthData) {
    const email = auth.email.toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();

    if (!user)
      return throwUnprocessableEntityError(`Invalid account, please try again`);

    const otpCode = await this.cacheService.get<string>(`${email}-otp`);

    if (user.isEmailVerified) {
      if (otpCode) {
        await this.cacheService.delete(`${email}-otp`);
      }
      return throwUnprocessableEntityError("Account already verified");
    }

    if (!otpCode || otpCode?.length != 6 || otpCode !== body.otp) {
      return throwUnprocessableEntityError(
        `Invalid OTP provided, please try again`
      );
    }

    await this.userModel
      .findOneAndUpdate({ email }, { isEmailVerified: true })
      .exec();

    // send otp to email
    return {
      message: `Email verified successfully`,
    };
  }

  /**
   * Send a verification token to the user's email
   * @param body
   * @returns {Promise<{message: string}>}
   */
  async sendVerificationOTP(authData: AuthData): Promise<{ message: string }> {
    const email = authData.email.toLowerCase();
    const user = await this.userModel.findOne({ email }).exec();

    if (!user)
      return throwUnprocessableEntityError("Invalid account, please try again");

    if (user.isEmailVerified) {
      return throwUnprocessableEntityError("Account already verified");
    }

    const otp =
      email === "philipowolabi79@gmail.com" ? "123456" : this.generateOTP();

    this.cacheService.set(`${email}-otp`, otp, TTL.IN_10_MINUTES);

    this.emailService.send({
      template: "verify-email",
      message: {
        to: email,
        subject: "Verify your account",
      },
      locals: {
        otp,
      },
    });

    return {
      message: `An OTP was sent to your email, use OTP to verify your email`,
    };
  }

  async changePassword(auth: AuthData, body: ChangePasswordDto) {
    let user;

    switch (auth.userType) {
      case UserTypes.ADMIN:
        user = await this.adminModel
          .findById(auth.userId)
          .select(GetUserPasswordDto)
          .exec();
        break;
      case UserTypes.MERCHANT:
        user = await this.merchantModel
          .findById(auth.userId)
          .select(GetUserPasswordDto)
          .exec();
        break;
      default:
        user = await this.userModel
          .findById(auth.userId)
          .select(GetUserPasswordDto)
          .exec();
    }

    if (!user)
      return throwUnprocessableEntityError(`Invalid account, please try again`);

    const isValidPassword = await user.validatePassword(body.oldPassword);

    if (!isValidPassword) {
      throwUnprocessableEntityError("Invalid password provided");
    }

    await user.setPassword(body.password);
    await user.save();

    return { message: "Password changed successfully" };
  }

  async setupPassword(auth: AuthData, body: SetupPasswordDto) {
    let user;

    switch (auth.userType) {
      case UserTypes.ADMIN:
        user = await this.adminModel
          .findById(auth.userId)
          .select(GetUserPasswordDto)
          .exec();
        break;
      case UserTypes.MERCHANT:
        user = await this.merchantModel
          .findById(auth.userId)
          .select(GetUserPasswordDto)
          .exec();
        break;
      default:
        user = await this.userModel
          .findById(auth.userId)
          .select(GetUserPasswordDto)
          .exec();
    }

    if (!user)
      return throwUnprocessableEntityError(`Invalid account, please try again`);

    if (user.passwordChangedAt) {
      return throwUnprocessableEntityError(
        "Only user without an existing password can setup a new one."
      );
    }

    await user.setPassword(body.password);
    await user.save();

    return { message: "Password setup successfully" };
  }

  async resetPassword(
    body: ResetPasswordDto,
    type: UserTypes = UserTypes.ADMIN
  ) {
    const otp = await this.cacheService.get<string>(
      `${body.email.toLowerCase()}-${type}-otp`
    );

    console.log(otp, body, type, "otp");

    let user;
    switch (type) {
      case UserTypes.ADMIN:
        user = await this.adminModel
          .findOne({ email: body.email.toLowerCase() })
          .exec();
        break;
      case UserTypes.MERCHANT:
        user = await this.merchantModel
          .findOne({ email: body.email.toLowerCase() })
          .exec();
        break;
      default:
        user = await this.userModel
          .findOne({ email: body.email.toLowerCase() })
          .exec();
    }

    if (!otp || otp != body.code || !user) {
      return throwUnprocessableEntityError("Invalid OTP");
    }

    await user.setPassword(body.password);

    user.isEmailVerified = true;
    await user.save();
    this.cacheService.delete(`${body.email.toLowerCase()}-${type}-otp`);

    this.emailService.send({
      message: {
        to: user.email,
        subject: "Your password has been reset",
      },
      template: "password-reset",
      locals: {
        time: new Date(user.passwordChangedAt).toLocaleTimeString(),
        date: new Date(user.passwordChangedAt).toDateString(),
        firstName: user.firstName,
      },
    });

    return { message: "Password changed successfully" };
  }

  async updateAddress(auth: AuthData, body: UpdateAddressDto) {
    const formattedData: Record<string, string> = {};

    Object.keys(body).forEach(
      (key) =>
        (formattedData[`addressInfo.${key}`] =
          body[key as keyof UpdateAddressDto])
    );

    let user: IUser | null = await this.userModel.findByIdAndUpdate(
      auth.userId,
      formattedData,
      { new: true }
    );

    if (!user) return throwUnprocessableEntityError("User does not exist");

    user = (await this.userModel.findById(auth.userId).select(GetUserAltDto))!;

    return { user };
  }

  async updateProfile(auth: AuthData, body: UpdateProfileDto) {
    let user: IUser | null = await this.userModel.findByIdAndUpdate(
      auth.userId,
      body,
      { new: true }
    );

    if (!user) return throwUnprocessableEntityError("User does not exist");

    user = (await this.userModel.findById(auth.userId).select(GetUserAltDto))!;

    return { user };
  }

  async updateProfileImage(auth: AuthData, data: UpdateProfileImageDto) {
    const user = await this.userModel.findById(auth.userId);

    if (!user)
      return throwUnauthorizedError("Invalid account, please try again.");

    const fileExtension = data.profileImage.originalname.split(".").pop()!;
    const filePath = this.generateFilePath(auth.userId, fileExtension);

    const profileImage = await this.storageService.uploadFile(
      data.profileImage,
      filePath
    );

    if (user.imageUrl) {
      try {
        await this.storageService.deleteFile(user.imageUrl);
      } catch (error) {
        AuthService.logger.error(
          `Unable to delete existing profile image for user ${auth.userId}`
        );
        AuthService.logJsonError(error);
      }
    }

    user.imageUrl = profileImage.fileUrl;

    await user.save();

    return { imageUrl: user.imageUrl };
  }

  generateFilePath(userId: string, ext: string) {
    return `images/profile-images/${userId}_${Date.now()}.${ext}`;
  }

  async seedAdmin() {
    let exists = await this.adminModel.exists({}).exec();

    if (!exists) {
      const user = await this.adminModel.create({
        email: "philipowolabi79@gmail.com",
        firstName: "Philip",
        lastName: "Owolabi",
      });

      await user.setPassword("Pass1234.");
      await user.save();
    }

    return { message: "Admin seeded successfully" };
  }

  async session(usr: AuthData): Promise<any> {
    let user;

    switch (usr.userType) {
      case UserTypes.ADMIN:
        user = await this.adminModel
          .findById(usr.userId)
          .select(GetUserAltDto)
          .exec();
        break;
      case UserTypes.MERCHANT:
        user = await this.merchantModel
          .findById(usr.userId)
          .select(GetUserAltDto)
          .exec();
        break;
      default:
        user = await this.userModel
          .findById(usr.userId)
          .select(GetUserAltDto)
          .exec();
    }

    if (!user) {
      throwUnauthorizedError("Invalid account, Please try again");
    }

    if (user?.userType === UserTypes.USER && !user?.businessId) {
      user.businessId = randomUUID();
      await user.save();
    }

    return { user };
  }

  async deleteAccount(auth: AuthData) {
    const user = await this.userModel.findById(auth.userId).exec();

    if (!user)
      return throwUnprocessableEntityError("Invalid account, please try again");

    user.email = `${v4()}@deleted.com`;
    user.firstName = "Deleted User";
    user.lastName = "Deleted User";
    user.deletedAt = new Date();

    await user.save();

    await this.expireSession(auth.userId);

    return { user, message: "Your account has been deleted." };
  }

  async getUsers(query: any) {
    if (query.id) {
      query._id = new Types.ObjectId(query.id);
    }
    const users = await this.userPagination.paginate(
      {
        ...query,
        deletedAt: { $exists: false },
        projections: [
          "id",
          "firstName",
          "lastName",
          "email",
          "createdAt",
          "deletedAt",
        ],
      },
      ["_id", "firstName", "lastName", "email"]
    );

    return { users };
  }

  getAdmins(query: any) {
    if (query.id) {
      query.id = new Types.ObjectId(query.id);
    }
    return this.adminPagination.paginate(
      {
        ...query,
        deletedAt: { $exists: false },
        projections: [
          "id",
          "firstName",
          "lastName",
          "email",
          "createdAt",
          "updatedAt",
        ],
      },
      ["id", "firstName", "lastName", "email"]
    );
  }

  async createAdmin(body: CreateAuthDto, auth: AuthData) {
    if (!auth.isSuperAdmin) {
      throwForbiddenError("You are not allowed to perform this action");
    }

    if (await this.adminModel.exists({ email: body.email })) {
      throwConflictError("Admin with email already exists");
    }

    let user = await this.adminModel.create(body);

    await user.setPassword(body.password);
    await user.save();

    return { user, message: "Admin created" };
  }

  async socialLogin(loginDto: GoogleLoginDto, socialOption: SocialOptionEnum) {
    loginDto.email = String(loginDto.email).toLowerCase();
    const { email, firstName, lastName, id, photoUrl } = loginDto;
    let user = await this.userModel.findOne({ email }).exec();

    if (!user) {
      user = await this.userModel.create({
        email,
        firstName,
        lastName,
        isEmailVerified: true,
        imageUrl: photoUrl,
      });
    }

    if (!user.firstName) {
      user.firstName = firstName;
    }

    if (!user.lastName) {
      user.lastName = lastName;
    }

    await user.save();

    if (!user.isActive) {
      throwUnprocessableEntityError("Your account is inactive");
    }

    switch (socialOption) {
      case SocialOptionEnum.GOOGLE:
        user.google = id;
        break;
      default:
        break;
    }

    user.isEmailVerified = true;
    user.lastLogin = new Date();

    if (!user.imageUrl) {
      user.imageUrl = loginDto.photoUrl;
    }

    await user.save();

    return await this.setSession(user, UserTypes.USER, 2.592e6);
  }

  async googleLogin(loginDto: GoogleLoginDto) {
    return await this.socialLogin(loginDto, SocialOptionEnum.GOOGLE);
  }

  async savePushToken(auth: AuthData, dto: SavePushTokenDto) {
    const user = await this.userModel
      .findByIdAndUpdate(auth.userId, { pushToken: dto.token }, { _id: 1 })
      .lean()
      .exec();

    if (!user) return throwForbiddenError("Forbidden");

    return { message: "Token saved successfully" };
  }

  async sendNotification(body: NotificationDto) {
    this.eventEmitter.emit(Events.SEND_NOTIFICATION, {
      ...body,
    });
  }
}
