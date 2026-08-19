import app from "./app.js";
import config from "./config/env.js";

const server = app.listen(config.port, () => {
  console.log(`[Server] RepoLens backend running in ${config.nodeEnv} mode on port ${config.port}`);
  console.log(`[Server] Health check available at http://localhost:${config.port}/api/health`);
});

// Graceful shutdown handling
function shutdown() {
  console.log("[Server] Shutting down gracefully...");
  server.close(() => {
    console.log("[Server] Closed remaining connections.");
    process.exit(0);
  });

  // Force close after 5 seconds if still pending
  setTimeout(() => {
    console.error("[Server] Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default server;
