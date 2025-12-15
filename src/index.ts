import { Task, TaskConfig, ScheduledTask, ScheduleTaskConfig } from "./task";
import { configure } from "./config";
import { GlobalWorker } from "./worker";

/**
 * Creates a new task definition that can be manually triggered.
 *
 * Tasks are automatically registered with the worker when defined.
 * Use `.trigger()` to manually execute the task with a payload.
 *
 * @template T - The type of the task payload
 * @param config - Task configuration
 * @returns A Task instance that can be triggered with `.trigger()`
 *
 * @example
 * ```typescript
 * const sendEmail = defineTask({
 *   id: "email.send",
 *   run: async (payload: { email: string; subject: string }) => {
 *     await sendEmailToUser(payload.email, payload.subject);
 *   },
 *   onError: async (error, payload) => {
 *     console.error(`Failed to send email to ${payload.email}:`, error.message);
 *   },
 * });
 *
 * // Later, trigger it
 * await sendEmail.trigger({ email: "user@example.com", subject: "Hello" });
 * ```
 */
export function defineTask<T>(config: TaskConfig<T>): Task<T> {
  return new Task<T>(config);
}

/**
 * Creates a scheduled task that runs automatically based on a cron pattern.
 *
 * Scheduled tasks start automatically when the worker starts - no need to call `.trigger()`.
 * The task will run according to the specified cron pattern.
 *
 * @template T - The type of the task payload (usually void for scheduled tasks)
 * @param config - Scheduled task configuration
 * @returns A ScheduledTask instance that runs automatically
 *
 * @example
 * ```typescript
 * const dailyReport = scheduleTask({
 *   id: "reports.daily",
 *   cron: "0 9 * * *", // Every day at 9 AM
 *   run: async () => {
 *     await generateDailyReport();
 *   },
 *   onError: async (error) => {
 *     console.error("Failed to generate report:", error.message);
 *   },
 * });
 *
 * // Task runs automatically - no need to trigger manually
 * ```
 */
export function scheduleTask<T>(
  config: ScheduleTaskConfig<T>
): ScheduledTask<T> {
  return new ScheduledTask<T>(config);
}

/**
 * Manually starts the global worker.
 *
 * Usually not needed as the worker auto-starts when the first task is triggered.
 * This is useful if you want to ensure the worker is running before your app
 * starts accepting requests, or if you have scheduled tasks that need the
 * worker to be running.
 *
 * @example
 * ```typescript
 * import { startWorker } from "@benrobo/queueflow";
 *
 * // Start worker before app starts
 * startWorker();
 *
 * // Now your app can accept requests
 * app.listen(3000);
 * ```
 */
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
