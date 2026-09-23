import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** The subset of JSON Schema that MCP tool inputs use. */
export interface JsonSchema {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  default?: unknown;
}

export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
}

export interface ToolCallOutcome {
  isError: boolean;
  /** structuredContent when the tool returned it, otherwise the text content. */
  result: unknown;
}

/** Everything the console needs from Frank. Pages depend on this, not on the SDK. */
export interface Frank {
  listTools(): Promise<ToolInfo[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallOutcome>;
}

/**
 * A Frank reached at /mcp on the same origin that served the console
 * (ADR-006), so no URL is configured and no request is cross-origin. The UI
 * holds no secrets (ADR-003).
 */
export function connectToFrank(url = new URL("/mcp", window.location.origin)): Frank {
  let connecting: Promise<Client> | undefined;

  function client(): Promise<Client> {
    connecting ??= (async () => {
      const c = new Client({ name: "frank-console", version: "0.1.0" });
      await c.connect(new StreamableHTTPClientTransport(url));
      return c;
    })().catch((err) => {
      connecting = undefined; // let the next call try again
      throw err;
    });
    return connecting;
  }

  return {
    async listTools() {
      const { tools } = await (await client()).listTools();
      return tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema as JsonSchema }));
    },
    async callTool(name, args) {
      const c = await client();
      const res = await c.callTool({ name, arguments: args });
      const text = (res.content as Array<{ type: string; text?: string }> | undefined)
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");
      return { isError: Boolean(res.isError), result: res.structuredContent ?? text ?? res };
    },
  };
}
