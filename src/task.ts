import { Queue, JobsOptions } from "bullmq";
import { createRedisConnection, getConfig } from "./config";
import { ensureWorkerStarted } from "./worker";
import { GlobalWorker } from "./worker";

interface TaskConfig<T> {
  id: string;
  queue?: string;
  retry?: number;
  handler: (payload: T) => Promise<void>;
  onError?: (error: Error, payload: T) => Promise<void> | void;
}

export class Task<T = any> {
  public readonly id: string;
  public readonly queue: string;
  private readonly handler: (payload: T) => Promise<void>;
  private readonly onError?: (error: Error, payload: T) => Promise<void> | void;
  private queueInstance: Queue | null = null;

  constructor(config: TaskConfig<T>) {
    this.id = config.id;
    this.queue =
      config.queue || config.id.split(".")[0] || getConfig().defaultQueue!;

    this.handler = config.handler;
    this.onError = config.onError;

    const globalWorker = GlobalWorker.getInstance();
    globalWorker.registerTask(this.id, this.queue, this.handler, this.onError);
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

export type { TaskConfig };
