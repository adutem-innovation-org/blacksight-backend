import { config } from "@/config";
import { logger } from "@/logging";
import { Job, RedisConnection, Worker, QueueEvents } from "bullmq";
import { Logger } from "winston";

const queueConfigs = {
  connection: {
    url: config.redis.url,
  },
  prefix: config.env?.toLowerCase() ?? "unspecified_env",
};

export class ReminderProcessor extends Worker {
  private static instance: ReminderProcessor;
  private readonly queueProcessor: (job: Job) => Promise<void>;

  private static logger: Logger = logger;

  constructor(
    name: string,
    queueProcessor: (job: Job) => Promise<void>,
    Connection?: typeof RedisConnection
  ) {
    super(name, (job: Job) => this.process(job), queueConfigs, Connection);
    this.queueProcessor = queueProcessor;
    this._setupEventListeners();
  }

  private _setupEventListeners() {
    // Listen to Worker lifecycle events
    this.on("completed", (job) => this.onCompleted(job));
    this.on("progress", (job) => this.onProgress(job));
    this.on("failed", (job) => this.onFailed(job));
    this.on("active", (job) => this.onActive(job));
    this.on("ready", () =>
      ReminderProcessor.logger.info("Reminder processor ready")
    );
  }

  static getInstance(
    name: string,
    queueProcessor: any,
    Connection?: typeof RedisConnection
  ) {
    if (!ReminderProcessor.instance) {
      ReminderProcessor.instance = new ReminderProcessor(
        name,
        queueProcessor,
        Connection
      );
    }
    return ReminderProcessor.instance;
  }

  onCompleted(job: Job) {
    const { id, name, queueName, finishedOn, returnvalue } = job;
    const completionTime = finishedOn ? new Date(finishedOn).toISOString() : "";
    ReminderProcessor.logger.info(
      `Job id: ${id}, name: ${name} completed in queue ${queueName} on ${completionTime}. Result: ${returnvalue}`
    );
  }

  onProgress(job: Job) {
    const { id, name, progress } = job;
    ReminderProcessor.logger.info(
      `Job id: ${id}, name: ${name} completes ${progress}%`
    );
  }

  onFailed(job: Job | any) {
    const { id, name, queueName, failedReason } = job;
    ReminderProcessor.logger.error(
      `Job id: ${id}, name: ${name} failed in queue ${queueName}. Failed reason: ${failedReason}`
    );
  }

  onActive(job: Job) {
    const { id, name, queueName, timestamp } = job;
    const startTime = timestamp ? new Date(timestamp).toISOString() : "";
    ReminderProcessor.logger.info(
      `Job id: ${id}, name: ${name} starts in queue ${queueName} on ${startTime}.`
    );
  }

  async process(job: Job) {
    ReminderProcessor.logger.info(`Processing job: ${job.id}`);
    await this.queueProcessor(job);
    ReminderProcessor.logger.info(`Job processed: ${job.id}`);
  }
}

type JobType = {
  jobId: string;
  returnvalue: string;
  prev?: string;
};

type FailedJobType = {
  jobId: string;
  failedReason: string;
  prev?: string;
};

export class ReminderQueueEvents extends QueueEvents {
  private static instance: ReminderQueueEvents;

  constructor(name: string) {
    super(name, queueConfigs);
    this._setupEventListeners();
  }

  static getInstance(name: string) {
    if (!ReminderQueueEvents.instance) {
      ReminderQueueEvents.instance = new ReminderQueueEvents(name);
    }
    return ReminderQueueEvents.instance;
  }

  private _setupEventListeners() {
    this.on("completed", (job: JobType) => this.onCompleted(job));
    this.on("failed", (failedJob: FailedJobType) => this.onFailed(failedJob));
  }

  onCompleted({ jobId }: JobType) {
    console.log("completed::", jobId);
  }

  onFailed({ jobId }: FailedJobType) {
    console.log("failed::", jobId);
  }
}
