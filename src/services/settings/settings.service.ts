import { SettingsKeys } from "@/enums";
import { ISettings, Settings } from "@/models";
import { Model } from "mongoose";
import { config } from "@/config";
import { CreateSettingsDto, UpdateSettingsDto } from "@/decorators";
import { CacheService } from "@/utils";

const defaultSettings = config.settings as Record<
  SettingsKeys,
  number | string
>;

export class SettingsService {
  private static instance: SettingsService;

  private readonly settingsModel: Model<ISettings> = Settings;

  private readonly cacheService: CacheService;
  constructor() {
    this.settingsModel.syncIndexes().then(console.log).catch(console.error);
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): SettingsService {
    if (!this.instance) {
      this.instance = new SettingsService();
    }
    return this.instance;
  }

  async createSettings(body: CreateSettingsDto) {
    const settingsExist = await this.settingsModel.exists({});
    if (settingsExist) {
      await this.settingsModel.updateMany({}, body, { new: true });
    } else {
      await this.settingsModel.create(body);
    }

    return await this.findAll();
  }

  async findAll() {
    const data = await this.settingsModel.findOne({});
    return { data };
  }

  async updateSettings(body: UpdateSettingsDto) {
    await this.settingsModel.updateMany({}, body, { new: true });
    return await this.findAll();
  }

  async getSetting(key: SettingsKeys) {
    const data = await this.settingsModel.findOne({}).select(key);
    const defaultValue = defaultSettings[key as keyof typeof defaultSettings];
    if (!data) return defaultValue;
    const value = data[key as keyof typeof data];
    return value || defaultValue;
  }
}
