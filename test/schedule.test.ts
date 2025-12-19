import { configure, scheduleTask } from "../src/index";

configure({
  connection: process.env.REDIS_URL || "redis://localhost:6379",
  defaultQueue: "test-queue",
}).catch((error) => {
  console.error("Failed to configure Queueflow:");
  process.exit(1);
});

scheduleTask({
  id: "test.schedule",
  cron: "*/5 * * * * *", // Every 5 sec
  run: async () => {
    console.log("Test schedule task 1");
  },
});

scheduleTask({
  id: "test.schedule2",
  cron: "*/10 * * * * *", // Every 10 sec
  run: async () => {
    console.log("Test schedule task 2");
  },
});
