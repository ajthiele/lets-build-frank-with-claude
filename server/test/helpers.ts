import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/mcp.js";
import type { ToolContext } from "../src/tools/define.js";

export function fixedContext(uptimeSeconds = 42): ToolContext {
  const startedAt = new Date("2026-09-23T12:00:00Z");
  return {
    version: "9.9.9-test",
    startedAt,
    now: () => new Date(startedAt.getTime() + uptimeSeconds * 1000),
  };
}

/** An MCP client wired to Frank in memory: the real protocol, no network. */
export async function connectInMemory(ctx: ToolContext = fixedContext()): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createMcpServer(ctx).connect(serverTransport);
  const client = new Client({ name: "frank-test", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}
