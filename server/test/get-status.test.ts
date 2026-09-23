import { describe, expect, it } from "vitest";
import { connectInMemory, fixedContext } from "./helpers.js";

describe("get_status", () => {
  it("returns version, uptime and a greeting, with a summary", async () => {
    const client = await connectInMemory(fixedContext(42));
    const result = await client.callTool({ name: "get_status", arguments: {} });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      summary: expect.stringContaining("9.9.9-test"),
      version: "9.9.9-test",
      uptimeSeconds: 42,
      greeting: expect.any(String),
    });
  });

  it("mirrors the structured result as JSON text for older clients", async () => {
    const client = await connectInMemory();
    const result = await client.callTool({ name: "get_status", arguments: {} });
    const [first] = result.content as Array<{ type: string; text: string }>;

    expect(first.type).toBe("text");
    expect(JSON.parse(first.text)).toEqual(result.structuredContent);
  });

  it("never reports negative uptime if the clock goes backwards", async () => {
    const client = await connectInMemory(fixedContext(-5));
    const result = await client.callTool({ name: "get_status", arguments: {} });

    expect((result.structuredContent as { uptimeSeconds: number }).uptimeSeconds).toBe(0);
  });
});
