import { Worker } from "bullmq";
import Redis from "ioredis";
import { createRedisConnection } from "./config";

class GlobalWorker {
  private static instance: GlobalWorker;
  private workers: Map<string, Worker> = new Map();
  private taskHandlers: Map<string, Function> = new Map();
  private errorHandlers: Map<string, Function | undefined> = new Map();
  private redis: Redis;
  private isStarted = false;

  private constructor() {
    this.redis = createRedisConnection();
  }

  static getInstance(): GlobalWorker {
    if (!GlobalWorker.instance) {
      GlobalWorker.instance = new GlobalWorker();
    }
    return GlobalWorker.instance;
  }

  registerTask(
    taskId: string,
    queue: string,
    handler: Function,
    onError?: Function
  ): void {
    this.taskHandlers.set(taskId, handler);
    this.errorHandlers.set(taskId, onError);

    if (!this.workers.has(queue) && this.isStarted) {
      this.createQueueWorker(queue);
    }
  }

  async start(): Promise<void> {
    if (this.isStarted) return;

    const queues = new Set<string>();
    for (const [taskId] of this.taskHandlers) {
      const queue = taskId.includes(".") ? taskId.split(".")[0] : "default";
      queues.add(queue);
    }

    for (const queue of queues) {
      this.createQueueWorker(queue);
    }
    this.isStarted = true;
    console.log(`🚀 Worker started listening for tasks`);
  }

  private createQueueWorker(queueName: string): void {
    const worker = new Worker(
      queueName,
      async (job) => {
        const handler = this.taskHandlers.get(job.name);
        if (!handler) {
          throw new Error(`No handler for task: ${job.name}`);
        }
        await handler(job.data);
      },
      {
        connection: this.redis,
        concurrency: 5,
        removeOnComplete: {
          age: 100,
          count: 100,
        },
        removeOnFail: {
          age: 500,
          count: 500,
        },
      }
    );

    worker.on("completed", (job) => {
      console.log(`✅ ${job.name} completed`);
    });

    worker.on("failed", async (job, err) => {
      console.error(`❌ ${job?.name} failed:`, err.message);

      if (job) {
        const errorHandler = this.errorHandlers.get(job.name);
        if (errorHandler) {
          try {
            await errorHandler(err, job.data);
          } catch (handlerError) {
            console.error(
              `Error in onError handler for ${job.name}:`,
              handlerError
            );
          }
        }
      }
    });

    this.workers.set(queueName, worker);
  }

  async stop(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    await this.redis.quit();
    this.isStarted = false;
  }
}

export function ensureWorkerStarted(): void {
  const worker = GlobalWorker.getInstance();
  worker.start().catch(console.error);
}

export { GlobalWorker };
