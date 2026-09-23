import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// All settings come from the environment (ADR-001). The package root is one
// level above this file: server/ when run from src/ with tsx, /app when run
// from dist/ in the image, which is where the Dockerfile puts the console.
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface Config {
  port: number;
  consoleDir: string;
  version: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Must match the Dockerfile's PORT and deploy.yml's --target-port.
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got "${env.PORT}"`);
  }

  const pkg = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
    version: string;
  };

  return {
    port,
    consoleDir: path.join(packageRoot, "public"),
    version: pkg.version,
  };
}
