import { Queue, JobsOptions } from "bullmq";
import { createRedisConnection, getConfig } from "./config";
import { ensureWorkerStarted } from "./worker";
import { GlobalWorker } from "./worker";

interface TaskConfig<T> {
  id: string;
  queue?: string;
  retry?: number;
  run: (payload: T) => Promise<void>;
  onError?: (error: Error, payload: T) => Promise<void> | void;
  concurrency?: number;
}

interface ScheduleTaskConfig<T> {
  id: string;
  cron: string;
  queue?: string;
  run: (payload: T) => Promise<void>;
  onError?: (error: Error, payload: T) => Promise<void> | void;
  tz?: string;
  concurrency?: number;
}

export class Task<T = any> {
  public readonly id: string;
  public readonly queue: string;
  private readonly run: (payload: T) => Promise<void>;
  private readonly onError?: (error: Error, payload: T) => Promise<void> | void;
  private queueInstance: Queue | null = null;

  constructor(config: TaskConfig<T>) {
    this.id = config.id;
    this.queue =
      config.queue || config.id.split(".")[0] || getConfig().defaultQueue!;

    this.run = config.run;
    this.onError = config.onError;

    const globalWorker = GlobalWorker.getInstance();
    globalWorker.registerTask(
      this.id,
      this.queue,
      this.run,
      this.onError,
      config.concurrency
    );
  }

  async trigger(payload: T, options?: JobsOptions): Promise<void> {
    if (!this.queueInstance) {
      const redis = createRedisConnection();
      this.queueInstance = new Queue(this.queue, { connection: redis });
    }

    ensureWorkerStarted();

    const jobOptions: JobsOptions = {
      jobId: `${this.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...options,
    };

    await this.queueInstance.add(this.id, payload, jobOptions);
  }
}

export class ScheduledTask<T = any> {
  public readonly id: string;
  public readonly queue: string;
  private readonly run: (payload: T) => Promise<void>;
  private readonly onError?: (error: Error, payload: T) => Promise<void> | void;
  private readonly cron: string;
  private readonly tz?: string;
  private queueInstance: Queue | null = null;

  constructor(config: ScheduleTaskConfig<T>) {
    this.id = config.id;
    this.queue =
      config.queue || config.id.split(".")[0] || getConfig().defaultQueue!;
    this.run = config.run;
    this.onError = config.onError;
    this.cron = config.cron;
    this.tz = config.tz;

    const globalWorker = GlobalWorker.getInstance();
    globalWorker.registerTask(
      this.id,
      this.queue,
      this.run,
      this.onError,
      config.concurrency
    );

    this.schedule();
  }

  private async schedule(): Promise<void> {
    if (!this.queueInstance) {
      const redis = createRedisConnection();
      this.queueInstance = new Queue(this.queue, { connection: redis });
    }

    ensureWorkerStarted();

    await this.queueInstance.add(
      this.id,
      {},
      {
        repeat: {
          pattern: this.cron,
          tz: this.tz,
        },
        jobId: this.id,
      }
    );
  }
}

export type { TaskConfig, ScheduleTaskConfig };
