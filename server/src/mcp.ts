import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./tools/define.js";
import { tools } from "./tools/index.js";

export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer({ name: "frank", version: ctx.version });
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema, outputSchema: tool.outputSchema },
      (args: unknown) => tool.run(args, ctx),
    );
  }
  return server;
}
