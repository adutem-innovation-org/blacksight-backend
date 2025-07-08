import { GetUserAltDto, LiftSuspensionDto, SuspendUserDto } from "@/decorators";
import {
  aggregatePaginate,
  isAdmin,
  throwForbiddenError,
  throwNotFoundError,
  throwUnprocessableEntityError,
} from "@/helpers";
import { AuthData } from "@/interfaces";
import {
  Admin,
  IAdmin,
  ISuspensionLog,
  IUser,
  SuspensionLog,
  User,
} from "@/models";
import { PaginationService } from "@/utils";
import { Model, Types } from "mongoose";

export class AuthAdminService {
  private static instance: AuthAdminService;

  private readonly userModel: Model<IUser> = User;
  private readonly adminModel: Model<IAdmin> = Admin;
  private readonly suspensionLogModel: Model<ISuspensionLog> = SuspensionLog;

  private readonly userPagination: PaginationService<IUser>;
  private readonly adminPagination: PaginationService<IAdmin>;
  private readonly suspensionPagination: PaginationService<ISuspensionLog>;

  constructor() {
    this.userPagination = new PaginationService(this.userModel);
    this.adminPagination = new PaginationService(this.adminModel);
    this.suspensionPagination = new PaginationService(this.suspensionLogModel);
  }

  static getInstance(): AuthAdminService {
    if (!this.instance) {
      this.instance = new AuthAdminService();
    }
    return this.instance;
  }

  async getUsers(query: any) {
    if (query.id) {
      query._id = new Types.ObjectId(query.id);
    }
    // const users = await this.userPagination.paginate(
    //   {
    //     query: { ...query, deletedAt: { $exists: false } },
    //     projections: [
    //       "id",
    //       "firstName",
    //       "lastName",
    //       "email",
    //       "lastLogin",
    //       "isActive",
    //       "isSuspended",
    //       "createdAt",
    //     ],
    //   },
    //   [
    //     "_id",
    //     "firstName",
    //     "lastName",
    //     "email",
    //     "lastLogin",
    //     "isActive",
    //     "isSuspended",
    //     "createdAt",
    //   ]
    // );
    // return users;

    if (query.id) {
      query._id = new Types.ObjectId(query.id);
    }

    const result = await aggregatePaginate(this.userModel, {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      match: {
        ...query,
        deletedAt: { $exists: false },
      },
      project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        lastLogin: 1,
        isActive: 1,
        isSuspended: 1,
        createdAt: 1,
        totalBots: 1,
        totalKnowledgeBases: 1,
      },
      sort: { createdAt: -1 },
      lookups: {
        bots: {
          from: "bots",
          localField: "_id",
          foreignField: "businessId",
        },
        knowledgeBases: {
          from: "knowledge-bases",
          localField: "_id",
          foreignField: "businessId",
        },
      },
    });

    return result;
  }

  async getUsersAnalytics(auth: AuthData) {
    const result = await Promise.allSettled([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({
        $or: [{ isSuspended: false }, { isSuspended: { $exists: false } }],
        deletedAt: { $exists: false },
      }),
      this.userModel.countDocuments({ isSuspended: true }),
      this.userModel.countDocuments({ deletedAt: { $exists: true } }),
    ]);

    const totalUsers = result[0].status === "fulfilled" ? result[0].value : 0;
    const activeUsers = result[1].status === "fulfilled" ? result[1].value : 0;
    const suspendedUsers =
      result[2].status === "fulfilled" ? result[2].value : 0;
    const deletedUsers = result[3].status === "fulfilled" ? result[3].value : 0;

    return {
      data: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        deletedUsers,
      },
    };
  }

  async getAdmins(query: any) {
    if (query.id) {
      query.id = new Types.ObjectId(query.id);
    }
    return await this.adminPagination.paginate(
      {
        ...query,
        deletedAt: { $exists: false },
        projections: [
          "id",
          "firstName",
          "lastName",
          "email",
          "lastLogin",
          "isActive",
          "createdAt",
          "updatedAt",
        ],
      },
      ["id", "firstName", "lastName", "email", "lastLogin", "isActive"]
    );
  }

  async getAdminsAnalytics(auth: AuthData) {
    const result = await Promise.allSettled([
      this.adminModel.countDocuments(),
      this.adminModel.countDocuments({
        $or: [{ isSuspended: false }, { isSuspended: { $exists: false } }],
      }),
    ]);

    console.log(result);

    const totalAdmins = result[0].status === "fulfilled" ? result[0].value : 0;
    const activeAdmins = result[1].status === "fulfilled" ? result[1].value : 0;
    const suspendedAdmins = totalAdmins - activeAdmins;

    return {
      data: {
        totalAdmins,
        activeAdmins,
        suspendedAdmins,
      },
    };
  }

  async suspendUser(auth: AuthData, body: SuspendUserDto, userId: string) {
    if (!isAdmin(auth))
      return throwForbiddenError("You cannot carry out this operation");

    // Check if an existing suspension exist
    const suspension = await this.suspensionLogModel.findOne({
      userId: new Types.ObjectId(userId),
      liftedOn: { $exists: false },
    });

    if (suspension)
      return throwUnprocessableEntityError("User has an unlifted suspension");

    console.log(userId);

    // Find the said user in the database
    const user = await this.userModel.findById(userId).select(GetUserAltDto);

    if (!user) return throwNotFoundError("User not found");

    // Create a new suspension for the user
    const newSuspension = await this.suspensionLogModel.create({
      userId,
      role: user.userType,
      reason: body.reason,
      suspensionDate: new Date(),
      suspendedBy: auth.userId,
    });

    // Enforce the suspension on the user
    user.isSuspended = true;
    user.suspensionReason = newSuspension.reason;
    user.suspensionId = newSuspension._id;
    await user.save();

    return { user, message: "User suspended" };
  }

  async liftUserSuspension(auth: AuthData, userId: string) {
    if (!isAdmin(auth))
      return throwForbiddenError("You cannot carry out this operation");

    // Find the said user in the data
    const user = await this.userModel.findById(userId).select(GetUserAltDto);

    if (!user) return throwNotFoundError("User not found");

    if (!user.isSuspended)
      return throwUnprocessableEntityError("User is not suspended");

    if (!user.suspensionId)
      return throwUnprocessableEntityError(
        "User is not suspended or missing suspension identifier"
      );

    // Find the said suspension in the log
    const suspension = await this.suspensionLogModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(user.suspensionId),
        userId: new Types.ObjectId(user._id),
      },
      {
        liftedOn: new Date(),
        liftedBy: auth.userId,
      },
      { new: true }
    );

    if (!suspension)
      return throwNotFoundError("The associated suspension could not be found");

    // Enforce the lifted suspension on the user
    user.isSuspended = false;
    user.suspensionReason = "";
    user.suspensionId = undefined;
    await user.save();

    return { user, message: "User suspension lifted" };
  }

  async getAllSuspensions(query: any) {
    if (query.id) {
      query._id = new Types.ObjectId(query.id);
    }

    const suspensions = await this.suspensionPagination.paginate(
      {
        ...query,
        projections: [
          "id",
          "role",
          "suspensionDate",
          "suspendedBy",
          "reason",
          "liftedOn",
          "liftedBy",
          "createdAt",
        ],
      },
      [
        "_id",
        "role",
        "suspensionDate",
        "suspendedBy",
        "reason",
        "liftedOn",
        "liftedBy",
      ]
    );

    return { suspensions };
  }
}
