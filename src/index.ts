import { Task, TaskConfig } from "./task";
import { configure } from "./config";
import { GlobalWorker } from "./worker";

export function defineTask<T>(config: TaskConfig<T>): Task<T> {
  return new Task<T>(config);
}

export function startWorker(): void {
  const worker = GlobalWorker.getInstance();
  worker.start();
}

export { configure };
export type { Task, TaskConfig } from "./task";
export type { RedisConfig } from "./config";
