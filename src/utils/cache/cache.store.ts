import { logger } from "@/logging";
import { Redis, RedisOptions } from "ioredis";

export interface StoreConfig extends RedisOptions {
  url: string;
  ttl?: number;
}

export class RedisStore {
  protected client!: Redis;
  protected _tags: string[] = [];

  constructor(protected readonly config: StoreConfig) {
    this.createClient(config);
  }

  protected createClient(config: StoreConfig): this {
    logger.info(`Connecting to redis at >> ${config.url}`);
    this.client = new Redis(config.url, {
      ...config,
      maxRetriesPerRequest: 5,
      connectTimeout: 10000,
    });
    this.client.on("connect", () => {
      logger.info("Connected to Redis");
      this.testConnection();
    });
    this.client.on("error", (err) => {
      logger.error(`Failed to connect to Redis: ${err}`);
      this.client.quit();
      process.exit();
    });
    return this;
  }

  async testConnection() {
    const response = await this.client.ping();
    logger.info(`PING Response: ${response}`);
  }

  getConnection(): Redis {
    return this.client;
  }

  getClient(): Redis {
    return this.client;
  }

  tags(...tags: string[]): this {
    this._tags = [...this._tags, ...tags.flat()];
    return this;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return data as T;
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const value = JSON.stringify(data);

    // Add keys to tag sets
    for (const tag of this._tags) {
      await this.client.sadd(`tag:${tag}`, key);
    }

    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(...keys: string[]): Promise<void> {
    // Remove keys from tag sets
    for (const tag of this._tags) {
      await this.client.srem(`tag:${tag}`, ...keys);
    }

    await this.client.del(keys);
  }

  async reset(): Promise<void> {
    if (this._tags.length === 0) {
      logger.error("Flusing entire database is not allowed");
      throw new Error("Flushing entire database is not allowed");
    }

    const tags = this._tags.map((tag) => `tag:${tag}`);
    const keys = await this.client.sunion(tags);

    if (keys.length > 0) {
      await this.client.del([...tags, ...keys]);
    }
  }

  async mset(args: [string, unknown][], ttl?: number): Promise<void> {
    const data: [string, string][] = args.map(([key, value]) => [
      key,
      JSON.stringify(value),
    ]);

    if (!ttl) {
      await this.client.mset(data);
      return;
    }

    const multi = this.client.multi();
    data.forEach(([key, value]) => {
      multi.setex(key, ttl, value);
    });
    multi.exec();
  }

  async mget<T = string>(...args: string[]): Promise<T[]> {
    return this.client.mget(args).then((values) => {
      return values.map((value) => {
        let decoded: any;
        try {
          decoded = JSON.parse(value || "");
        } catch {
          /* empty */
        } finally {
          return decoded || (value as T);
        }
      });
    });
  }

  keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
