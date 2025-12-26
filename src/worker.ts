import { Worker } from "bullmq";
import Redis from "ioredis";
import { getSharedRedisConnection, isDebugEnabled } from "./config";

class GlobalWorker {
  private static instance: GlobalWorker;
  private workers: Map<string, Worker> = new Map();
  public taskHandlers: Map<string, Function> = new Map();
  private errorHandlers: Map<string, Function | undefined> = new Map();
  private taskQueues: Map<string, string> = new Map();
  private redis: Redis | null = null;
  public isStarted = false;
  private connectionErrorLogged = false;

  private constructor() {
    // Don't create Redis connection here - wait until start() is called
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
    onError?: Function,
    concurrency?: number
  ): void {
    this.taskHandlers.set(taskId, handler);
    this.errorHandlers.set(taskId, onError);
    this.taskQueues.set(taskId, queue);

    if (!this.workers.has(queue) && this.isStarted) {
      this.createQueueWorker(queue, concurrency);
    }
  }

  async start(): Promise<void> {
    if (this.isStarted) return;

    // Get Redis connection when starting (not in constructor)
    try {
      this.redis = getSharedRedisConnection();
      this.setupRedisErrorHandlers();
    } catch (error: any) {
      console.error(
        `❌ Failed to start worker: ${error.message}. Please ensure Redis is running and configured.`
      );
      throw error;
    }

    const queues = new Set(this.taskQueues.values());

    for (const queue of queues) {
      this.createQueueWorker(queue);
    }

    this.isStarted = true;
    console.log(
      `🚀 Worker started listening for tasks on queues: ${Array.from(
        queues
      ).join(", ")}`
    );
  }

  private setupRedisErrorHandlers(): void {
    if (!this.redis) return;

    // Prevent connection error spam
    this.redis.on("error", (error) => {
      if (!this.connectionErrorLogged) {
        console.error(
          `❌ Redis connection error: ${error.message}. Please check your Redis configuration.`
        );
        this.connectionErrorLogged = true;
      }
    });

    this.redis.on("connect", () => {
      this.connectionErrorLogged = false;
      if (isDebugEnabled()) {
        console.log("✅ Redis connection established");
      }
    });
  }

  private createQueueWorker(queueName: string, concurrency?: number): void {
    if (!this.redis) {
      throw new Error(
        "Redis connection not available. Please call configure() first."
      );
    }

    const worker = new Worker(
      queueName,
      async (job) => {
        await this.processJob(job.name, job.data);
      },
      {
        connection: this.redis!,
        concurrency: concurrency || 5,
        removeOnComplete: { age: 100, count: 100 },
        removeOnFail: { age: 500, count: 500 },
      }
    );

    worker.on("failed", async (job, err) => {
      if (job) {
        await this.handleJobFailure(job.name, err, job.data);
      }
    });

    this.workers.set(queueName, worker);
  }

  private async processJob(taskId: string, data: any): Promise<void> {
    const handler = this.taskHandlers.get(taskId);
    if (!handler) {
      console.error(`No handler found for task: ${taskId}`);
      if (isDebugEnabled()) {
        console.error(
          `Available handlers:`,
          Array.from(this.taskHandlers.keys())
        );
      }
      throw new Error(`No handler for task: ${taskId}`);
    }

    await handler(data);
  }

  private async handleJobFailure(
    taskId: string,
    error: Error,
    data: any
  ): Promise<void> {
    const errorHandler = this.errorHandlers.get(taskId);
    if (errorHandler) {
      try {
        await errorHandler(error, data);
      } catch (handlerError) {
        console.error(`Error in onError handler for ${taskId}:`, handlerError);
      }
    }
  }

  async stop(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    this.workers.clear();
    this.isStarted = false;
  }
}

export function ensureWorkerStarted(): void {
  const worker = GlobalWorker.getInstance();
  worker.start().catch(console.error);
}

export { GlobalWorker };
