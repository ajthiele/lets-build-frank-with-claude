import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp.js";
import type { ToolContext } from "./tools/define.js";

export interface AppOptions {
  /** Built console files. Absent until ADR-003 is implemented, and Frank must work without them. */
  consoleDir: string;
  context: ToolContext;
}

// Plain Express rather than the SDK's createMcpExpressApp(): that helper only
// validates the Host header when bound to localhost, and Frank binds to all
// interfaces behind Azure's ingress, so it would add nothing but indirection.
export function createApp({ consoleDir, context }: AppOptions): Express {
  const app = express();
  app.disable("x-powered-by");

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Stateless Streamable HTTP: a fresh server and transport per request, with
  // no session IDs. Frank runs 0-1 replicas and scales to zero, so a session
  // store would buy nothing.
  app.post("/mcp", express.json({ limit: "1mb" }), async (req, res) => {
    const server = createMcpServer(context);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP request failed:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // No sessions means no server-sent stream (GET) and nothing to end (DELETE).
  app.all("/mcp", (_req, res) => {
    res
      .status(405)
      .set("Allow", "POST")
      .json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed. Frank is stateless: use POST /mcp." },
        id: null,
      });
  });

  if (existsSync(path.join(consoleDir, "index.html"))) {
    app.use(express.static(consoleDir));
  } else {
    app.get("/", (_req, res) => {
      res
        .type("text/plain")
        .send(
          "Frank is running, but his console has not been built yet (ADR-003).\n" +
            "MCP endpoint: POST /mcp\n" +
            "Health: GET /healthz\n",
        );
    });
  }

  return app;
}
