import Redis from "ioredis";
import { GlobalWorker } from "./worker";

/**
 * Configuration for Redis connection and queue settings.
 */
export interface RedisConfig {
  /**
   * Redis connection string or configuration object.
   *
   * - String format: "redis://localhost:6379" or "redis://user:pass@host:port/db"
   * - Object format: { host, port, username, password, db, tls }
   */
  connection?:
    | string
    | {
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        db?: number;
        tls?: any;
      };
  /** Default queue name for tasks that don't specify a queue (defaults to "default") */
  defaultQueue?: string;
}

let globalConfig: RedisConfig = {
  defaultQueue: "default",
};

/**
 * Configures the Redis connection and default settings for Queueflow.
 *
 * Call this once at your application startup before defining any tasks.
 * This will validate the Redis connection immediately and throw an error if invalid.
 *
 * @param config - Redis configuration
 * @returns Promise that resolves when configuration is complete
 * @throws {Error} If Redis connection cannot be established
 *
 * @example
 * ```typescript
 * import { configure } from "@benrobo/queueflow";
 *
 * // Using connection string with await
 * await configure({
 *   connection: process.env.REDIS_URL || "redis://localhost:6379",
 *   defaultQueue: "myapp",
 * });
 *
 * // Using object configuration with error handling
 * configure({
 *   connection: {
 *     host: "localhost",
 *     port: 6379,
 *     password: "your-password",
 *     db: 0,
 *   },
 * }).catch((error) => {
 *   console.error("Failed to configure Queueflow:", error);
 *   process.exit(1);
 * });
 * ```
 */
export async function configure(config: RedisConfig): Promise<void> {
  globalConfig = { ...globalConfig, ...config };

  if (config.connection) {
    const testRedis = createRedisConnection();

    try {
      await testRedis.ping();
      await testRedis.quit();
    } catch (error: any) {
      await testRedis.quit().catch(() => {});
      throw new Error(
        `Failed to connect to Redis: ${error.message}. Please check your Redis configuration.`
      );
    }

    try {
      const worker = GlobalWorker.getInstance();
      if (worker.taskHandlers.size > 0 && !worker.isStarted) {
        await worker.start();
      }
    } catch (err) {
      // GlobalWorker might not be initialized yet, which is fine
    }
  }
}

/**
 * Gets the current global configuration.
 *
 * @returns The current Redis configuration
 * @internal
 */
export function getConfig(): RedisConfig {
  return globalConfig;
}

/**
 * Creates a Redis connection based on the current configuration.
 *
 * @returns A new Redis instance
 * @internal
 */
export function createRedisConnection(): Redis {
  try {
    const config = getConfig();

    if (typeof config.connection === "string") {
      return new Redis(config.connection, {
        maxRetriesPerRequest: null,
      });
    }

    return new Redis({
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: null,
      ...config.connection,
    });
  } catch (error) {
    console.error("Error creating Redis connection:", error);
    throw new Error("Failed to create Redis connection");
  }
}
