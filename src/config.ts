import Redis from "ioredis";

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
 *
 * @param config - Redis configuration
 *
 * @example
 * ```typescript
 * import { configure } from "@benrobo/queueflow";
 *
 * // Using connection string
 * configure({
 *   connection: process.env.REDIS_URL || "redis://localhost:6379",
 *   defaultQueue: "myapp",
 * });
 *
 * // Using object configuration
 * configure({
 *   connection: {
 *     host: "localhost",
 *     port: 6379,
 *     password: "your-password",
 *     db: 0,
 *   },
 * });
 * ```
 */
export function configure(config: RedisConfig): void {
  globalConfig = { ...globalConfig, ...config };
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
      return new Redis(config.connection);
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
