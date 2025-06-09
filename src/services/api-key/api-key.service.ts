import { throwForbiddenError, throwNotFoundError } from "@/helpers";
import { AuthData } from "@/interfaces";
import { ApiKey, IApiKey } from "@/models";
import { PaginationService } from "@/utils";
import { createHash, randomBytes } from "crypto";
import { addDays, startOfDay } from "date-fns";
import { Model, Types } from "mongoose";

export class ApiKeyService {
  private static instance: ApiKeyService;

  // Model
  private readonly apiKeyModel: Model<IApiKey> = ApiKey;

  // Pagination
  private readonly paginationService: PaginationService<IApiKey>;

  constructor() {
    this.paginationService = new PaginationService(this.apiKeyModel);
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ApiKeyService();
    }
    return this.instance;
  }

  async createApiKey(auth: AuthData) {
    const { raw, hashed } = this._generateApiKey();

    const startOfToday = startOfDay(new Date());

    const apiKey = await this.apiKeyModel.create({
      key: hashed,
      ownerId: auth.userId,
      createdBy: auth.userId,
      expiresAt: addDays(startOfToday, 92),
    });

    const { key, ...apiKeyDoc } = apiKey.toJSON();

    return {
      apiKey: { ...apiKeyDoc, secretKey: raw },
      message: "Api key created",
    };
  }

  async resetApiKey(auth: AuthData, id: string) {
    const userId = auth.userId.toString();

    const oldKey = await this.apiKeyModel.findById(id);
    if (!oldKey) return throwNotFoundError("API key not found");

    if (oldKey.createdBy.toString() !== userId) {
      return throwForbiddenError("Forbidden");
    }

    await oldKey.deleteOne();

    const { raw, hashed } = this._generateApiKey();

    const newKey = await this.apiKeyModel.create({
      key: hashed,
      ownerId: oldKey.ownerId,
      createdBy: userId,
      scopes: oldKey.scopes,
      meta: oldKey.meta,
    });

    const { key, ...apiKeyDoc } = newKey.toJSON();

    return {
      message: "API key reset successful",
      apiKey: { ...apiKeyDoc, secretKey: raw },
      oldId: oldKey._id,
    };
  }

  async getAllApiKeys(auth: AuthData, page: number = 1) {
    const result = await this.paginationService.paginate(
      {
        query: { ownerId: new Types.ObjectId(auth.userId) },
        sort: { createdAt: -1 },
        limit: 20,
        page,
      },
      []
    );
    return result;
  }

  async revokeApiKey(auth: AuthData, id: string) {
    const userId = auth.userId.toString();

    const apiKey = await this.apiKeyModel.findOneAndUpdate(
      {
        ownerId: new Types.ObjectId(userId),
        _id: new Types.ObjectId(id),
      },
      { revoked: true },
      { new: true }
    );

    if (!apiKey) return throwNotFoundError("API key not found");

    const { key, ...apiKeyDoc } = apiKey.toJSON();

    return { message: "API key revoked", apiKe: apiKeyDoc };
  }

  private _generateApiKey(): { raw: string; hashed: string } {
    const raw = randomBytes(32).toString("hex");
    const hashed = createHash("sha256").update(raw).digest("hex");
    return { raw, hashed };
  }
}
