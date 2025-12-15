import { Task, TaskConfig, ScheduledTask, ScheduleTaskConfig } from "./task";
import { configure } from "./config";
import { GlobalWorker } from "./worker";

export function defineTask<T>(config: TaskConfig<T>): Task<T> {
  return new Task<T>(config);
}

export function scheduleTask<T>(
  config: ScheduleTaskConfig<T>
): ScheduledTask<T> {
  return new ScheduledTask<T>(config);
}

export function startWorker(): void {
  const worker = GlobalWorker.getInstance();
  worker.start();
}

export { configure };
export type {
  Task,
  TaskConfig,
  ScheduledTask,
  ScheduleTaskConfig,
} from "./task";
export type { RedisConfig } from "./config";
