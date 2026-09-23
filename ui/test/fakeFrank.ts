import { vi } from "vitest";
import type { Frank, ToolInfo } from "../src/mcp";

// The Docker build runs these tests with no Frank running, so pages are tested
// against this stand-in for the Frank interface in src/mcp.ts.
export function fakeFrank(tools: ToolInfo[] = [getStatusTool]) {
  return {
    listTools: vi.fn<Frank["listTools"]>(async () => tools),
    callTool: vi.fn<Frank["callTool"]>(async (name) => ({
      isError: false,
      result: name === "get_status" ? status : { summary: `called ${name}` },
    })),
  } satisfies Frank;
}

export const status = {
  summary: "Frank 1.2.3 is up and has been running for 7 seconds.",
  version: "1.2.3",
  uptimeSeconds: 7,
  greeting: "Hello, I'm Frank.",
};

export const getStatusTool: ToolInfo = {
  name: "get_status",
  description: "Returns Frank's version and uptime.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false } as ToolInfo["inputSchema"],
};
