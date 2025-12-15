import { Queue, JobsOptions } from "bullmq";
import { createRedisConnection, getConfig } from "./config";
import { ensureWorkerStarted } from "./worker";
import { GlobalWorker } from "./worker";

/**
 * Configuration for defining a task that can be manually triggered.
 *
 * @template T - The type of the task payload
 */
interface TaskConfig<T> {
  /** Unique identifier for the task (e.g., "email.welcome") */
  id: string;
  /** Optional queue name (defaults to prefix of id) */
  queue?: string;
  /** Optional number of retry attempts */
  retry?: number;
  /** Async function that processes the task payload */
  run: (payload: T) => Promise<void>;
  /** Optional error handler callback that receives the error and original payload */
  onError?: (error: Error, payload: T) => Promise<void> | void;
  /** Optional number of concurrent tasks for this queue (defaults to 5) */
  concurrency?: number;
}

/**
 * Configuration for defining a scheduled task that runs automatically based on a cron pattern.
 *
 * @template T - The type of the task payload
 */
interface ScheduleTaskConfig<T> {
  /** Unique identifier for the task (e.g., "reports.daily") */
  id: string;
  /** Cron pattern for scheduling (e.g., "0 9 * * *" for daily at 9 AM) */
  cron: string;
  /** Optional queue name (defaults to prefix of id) */
  queue?: string;
  /** Async function that processes the task */
  run: (payload: T) => Promise<void>;
  /** Optional error handler callback that receives the error and original payload */
  onError?: (error: Error, payload: T) => Promise<void> | void;
  /** Optional timezone for the cron schedule (e.g., "America/New_York") */
  tz?: string;
  /** Optional number of concurrent tasks for this queue (defaults to 5) */
  concurrency?: number;
}

/**
 * A task that can be manually triggered with a payload.
 *
 * @template T - The type of the task payload
 */
export class Task<T = any> {
  /** Unique identifier for the task */
  public readonly id: string;
  /** Queue name where the task will be processed */
  public readonly queue: string;
  private readonly run: (payload: T) => Promise<void>;
  private readonly onError?: (error: Error, payload: T) => Promise<void> | void;
  private queueInstance: Queue | null = null;

  /**
   * Creates a new Task instance.
   *
   * @param config - Task configuration
   */
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

  /**
   * Triggers the task to run with the given payload.
   *
   * @param payload - The typed payload for the task
   * @param options - Optional BullMQ job options (delay, attempts, backoff, etc.)
   * @returns Promise that resolves when the task is queued
   *
   * @example
   * ```typescript
   * await sendEmail.trigger({ email: "user@example.com" });
   *
   * // With delay
   * await sendEmail.trigger(
   *   { email: "user@example.com" },
   *   { delay: 5000 }
   * );
   * ```
   */
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

/**
 * A scheduled task that runs automatically based on a cron pattern.
 * The task starts automatically when the worker starts - no need to call .trigger().
 *
 * @template T - The type of the task payload
 */
export class ScheduledTask<T = any> {
  /** Unique identifier for the task */
  public readonly id: string;
  /** Queue name where the task will be processed */
  public readonly queue: string;
  private readonly run: (payload: T) => Promise<void>;
  private readonly onError?: (error: Error, payload: T) => Promise<void> | void;
  private readonly cron: string;
  private readonly tz?: string;
  private queueInstance: Queue | null = null;

  /**
   * Creates a new ScheduledTask instance and automatically schedules it.
   *
   * @param config - Scheduled task configuration
   */
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

    const repeatOpts = {
      pattern: this.cron,
      tz: this.tz,
    };

    const repeatableJobs = await this.queueInstance.getRepeatableJobs();
    const existingJob = repeatableJobs.find(
      (job) => job.id === this.id || job.name === this.id
    );

    if (existingJob) {
      await this.queueInstance.removeJobScheduler(existingJob.key);
    }

    await this.queueInstance.add(
      this.id,
      {},
      {
        repeat: repeatOpts,
        jobId: this.id,
      }
    );
  }
}

export type { TaskConfig, ScheduleTaskConfig };
