import { scheduleTask } from "../src/index";

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
