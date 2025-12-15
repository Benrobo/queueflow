import Redis from "ioredis";

export interface RedisConfig {
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
  defaultQueue?: string;
}

let globalConfig: RedisConfig = {
  defaultQueue: "default",
};

export function configure(config: RedisConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

export function getConfig(): RedisConfig {
  return globalConfig;
}

export function createRedisConnection(): Redis {
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
}
