import { UserTypes } from "@/enums";
import {
  decrypt,
  encrypt,
  isAdmin,
  isSuperAdmin,
  throwForbiddenError,
  throwNotFoundError,
} from "@/helpers";
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
    const keyExist = await this.apiKeyModel.findOne({
      ownerId: new Types.ObjectId(auth.userId),
    });
    if (keyExist) {
      const { key, secretKeyEncrypted, ...rest } = keyExist.toJSON();
      return { apiKey: { ...rest, secretKey: decrypt(secretKeyEncrypted) } };
    }

    const { raw, hashed } = this._generateApiKey();
    const encrypted = encrypt(raw);

    const startOfToday = startOfDay(new Date());

    const apiKey = await this.apiKeyModel.create({
      key: hashed,
      secretKeyEncrypted: encrypted,
      ownerId: auth.userId,
      createdBy: auth.userId,
      expiresAt: addDays(startOfToday, 92),
    });

    const { key, secretKeyEncrypted, ...apiKeyDoc } = apiKey.toJSON();

    return {
      apiKey: { ...apiKeyDoc, secretKey: raw },
      message: "Api key created",
    };
  }

  async regenerateApiKey(auth: AuthData, id: string) {
    const userId = auth.userId.toString();

    const apiKey = await this.apiKeyModel.findById(id);
    if (!apiKey) return throwNotFoundError("API key not found");

    if (apiKey.createdBy.toString() !== userId) {
      return throwForbiddenError("Forbidden");
    }

    // await apiKey.deleteOne();

    const { raw, hashed } = this._generateApiKey();
    const encrypted = encrypt(raw);

    // const newKey = await this.apiKeyModel.create({
    //   key: hashed,
    //   secretKeyEncrypted: encrypted,
    //   ownerId: oldKey.ownerId,
    //   createdBy: userId,
    //   scopes: oldKey.scopes,
    //   meta: oldKey.meta,
    // });
    apiKey.key = hashed;
    apiKey.secretKeyEncrypted = encrypted;
    await apiKey.save();

    const { key, secretKeyEncrypted, ...apiKeyDoc } = apiKey.toJSON();

    return {
      message: "API key regenrated",
      apiKey: { ...apiKeyDoc, secretKey: raw },
      // oldId: oldKey._id,
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

  async getUserApiKey(auth: AuthData) {
    const keyDoc = await this.apiKeyModel.findOne({
      ownerId: new Types.ObjectId(auth.userId),
    });

    if (!keyDoc) return { apiKey: {} };

    if (!keyDoc.secretKeyEncrypted) return { apiKey: {} };

    const { key, secretKeyEncrypted, ...apiKeyDoc } = keyDoc.toJSON();

    const secretKey = decrypt(secretKeyEncrypted);

    return { apiKey: { ...apiKeyDoc, secretKey } };
  }

  private async updateApiKeyStatus(
    auth: AuthData,
    id: string,
    updates: Partial<IApiKey>,
    restrictToOwner: boolean = false
  ) {
    const userId = auth.userId.toString();
    const query: Record<string, any> = { _id: new Types.ObjectId(id) };

    if (restrictToOwner && auth.userType === UserTypes.USER) {
      query["ownerId"] = new Types.ObjectId(userId);
    }

    if (auth.userType === UserTypes.ADMIN && !isSuperAdmin(auth)) {
      return throwForbiddenError("Forbidden");
    }

    const apiKey = await this.apiKeyModel.findOneAndUpdate(query, updates, {
      new: true,
    });

    if (!apiKey) return throwNotFoundError("API key not found");

    const { key, secretKeyEncrypted, ...apiKeyDoc } = apiKey.toJSON();

    return { apiKey: { ...apiKeyDoc } };
  }

  async revokeApiKey(auth: AuthData, id: string) {
    if (!isAdmin(auth) && !isSuperAdmin(auth))
      return throwForbiddenError("Forbidden");

    const result = await this.updateApiKeyStatus(auth, id, { revoked: true });
    return { message: "API key revoked", ...result };
  }

  async reactivateApiKey(auth: AuthData, id: string) {
    if (!isAdmin(auth) && !isSuperAdmin(auth))
      return throwForbiddenError("Forbidden");

    const result = await this.updateApiKeyStatus(auth, id, { revoked: false });
    return { message: "API key reactivated", ...result };
  }

  async activateApiKey(auth: AuthData, id: string) {
    const result = await this.updateApiKeyStatus(
      auth,
      id,
      { disabled: false },
      true
    );
    return { message: "API key activated", ...result };
  }

  /**
   *
   * @param auth The currently authenticated user
   * @param id The mongodb identifier of the api key that is to be modified
   * @returns
   */
  async deactivateApiKey(auth: AuthData, id: string) {
    const result = await this.updateApiKeyStatus(
      auth,
      id,
      { disabled: true },
      true
    );
    return { message: "API key deactivated", ...result };
  }

  private _generateApiKey(): { raw: string; hashed: string } {
    const raw = randomBytes(32).toString("hex");
    const hashed = createHash("sha256").update(raw).digest("hex");
    return { raw, hashed };
  }
}
