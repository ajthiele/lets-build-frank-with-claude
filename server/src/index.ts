import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp({
  consoleDir: config.consoleDir,
  context: { version: config.version, startedAt: new Date(), now: () => new Date() },
});

const server = app.listen(config.port, (err?: Error) => {
  if (err) {
    console.error(`Frank could not listen on port ${config.port}:`, err);
    process.exit(1);
  }
  console.log(`Frank ${config.version} listening on port ${config.port} (MCP at POST /mcp)`);
});

// Container Apps sends SIGTERM when scaling to zero.
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
