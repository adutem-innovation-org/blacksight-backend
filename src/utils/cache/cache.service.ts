import { config } from "@/config";
import { RedisStore, StoreConfig } from "./cache.store";

export class CacheService {
  private store: RedisStore;
  private static instance: CacheService;

  constructor(config: StoreConfig) {
    this.store = new RedisStore(config);
  }

  static getInstance(): CacheService {
    if (!this.instance) {
      this.instance = new CacheService({ url: config.redis.url });
    }
    return this.instance;
  }

  tags(...tags: string[]) {
    this.store.tags(...tags);
    return this;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.store.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.store.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }

  async flush(): Promise<void> {
    await this.store.reset();
  }

  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const value = await callback();
    await this.set(key, value, ttl);
    return value;
  }
}

export const initRedis = async () => {
  CacheService.getInstance();
};
