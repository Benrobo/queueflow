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
  /** Enable debug logging (defaults to false) */
  debug?: boolean;
}

let globalConfig: RedisConfig = {
  defaultQueue: "default",
  debug: false,
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
 *
 * // Enable debug logging
 * configure({
 *   connection: process.env.REDIS_URL,
 *   debug: true,
 * });
 * ```
 */
export async function configure(config: RedisConfig): Promise<void> {
  if (config.connection && sharedRedisConnection) {
    resetSharedRedisConnection();
  }

  globalConfig = { ...globalConfig, ...config };

  if (config.connection) {
    const testRedis = getSharedRedisConnection();

    try {
      await testRedis.ping();
    } catch (error: any) {
      resetSharedRedisConnection();
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
 * Checks if debug mode is enabled.
 *
 * @returns True if debug logging is enabled
 * @internal
 */
export function isDebugEnabled(): boolean {
  return globalConfig.debug === true;
}

let sharedRedisConnection: Redis | null = null;

/**
 * Gets or creates a shared Redis connection instance.
 * This ensures only one Redis connection is created and reused across the application.
 *
 * @returns The shared Redis instance
 * @internal
 */
export function getSharedRedisConnection(): Redis {
  if (sharedRedisConnection) {
    return sharedRedisConnection;
  }

  const config = getConfig();

  if (!config.connection) {
    throw new Error(
      "Redis connection not configured. Please call configure() with a connection setting first."
    );
  }

  try {
    if (typeof config.connection === "string") {
      sharedRedisConnection = new Redis(config.connection, {
        maxRetriesPerRequest: null,
      });
    } else {
      sharedRedisConnection = new Redis({
        maxRetriesPerRequest: null,
        ...config.connection,
        host: config.connection.host ?? "localhost",
        port: config.connection.port ?? 6379,
      });
    }

    return sharedRedisConnection;
  } catch (error) {
    console.error("Error creating Redis connection:", error);
    throw new Error("Failed to create Redis connection");
  }
}

/**
 * Resets the shared Redis connection (useful for testing or reconfiguration).
 * @internal
 */
export function resetSharedRedisConnection(): void {
  if (sharedRedisConnection) {
    sharedRedisConnection.quit().catch(() => {});
    sharedRedisConnection = null;
  }
}

/**
 * Creates a Redis connection based on the current configuration.
 * Note: This creates a new connection instance. For most use cases, use getSharedRedisConnection() instead.
 *
 * @returns A new Redis instance
 * @internal
 */
export function createRedisConnection(): Redis {
  const config = getConfig();

  if (!config.connection) {
    throw new Error(
      "Redis connection not configured. Please call configure() with a connection setting first."
    );
  }

  try {
    if (typeof config.connection === "string") {
      return new Redis(config.connection, {
        maxRetriesPerRequest: null,
      });
    }

    return new Redis({
      maxRetriesPerRequest: null,
      ...config.connection,
      host: config.connection.host ?? "localhost",
      port: config.connection.port ?? 6379,
    });
  } catch (error) {
    console.error("Error creating Redis connection:", error);
    throw new Error("Failed to create Redis connection");
  }
}
