import { scheduleTask } from "@benrobo/queueflow";

export const dailyReport = scheduleTask({
  id: "reports.daily",
  cron: "0 9 * * *",
  run: async () => {
    console.log("📊 Generating daily report...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("✅ Daily report generated");
  },
  onError: async (error) => {
    console.error("❌ Failed to generate daily report:", error.message);
  },
});

export const hourlyCleanup = scheduleTask({
  id: "cleanup.hourly",
  cron: "0 * * * *",
  run: async () => {
    console.log("🧹 Running hourly cleanup...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("✅ Hourly cleanup completed");
  },
});

export const weeklyBackup = scheduleTask({
  id: "backup.weekly",
  cron: "0 2 * * 0",
  tz: "America/New_York",
  run: async () => {
    console.log("💾 Starting weekly backup...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("✅ Weekly backup completed");
  },
  onError: async (error) => {
    console.error("❌ Backup failed:", error.message);
  },
});

export const dailyReport5Seconds = scheduleTask({
  id: "reports.daily5seconds",
  cron: "*/5 * * * * *", // Every 5 seconds
  run: async () => {
    console.log("Generating report... 5 seconds");
  },
});
