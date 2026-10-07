import { ENV } from "./config/env.js";
import app from "./app.js";
import job from "./config/cron.js";

const PORT = ENV.PORT || 5001;

if (ENV.NODE_ENV === "production") job.start();

const server = app.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);
});

// Deploy/yeniden başlatmada devam eden istekler bitsin, sonra kapan
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  job.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection", reason);
});
