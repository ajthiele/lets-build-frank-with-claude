import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool, TOOL_NAME_PATTERN } from "../src/tools/define.js";
import { tools } from "../src/tools/index.js";
import { connectInMemory } from "./helpers.js";

// ADR-002, checked against what an MCP client actually sees, for every tool.
describe("every registered tool follows ADR-002", async () => {
  const client = await connectInMemory();
  const { tools: listed } = await client.listTools();

  it("registers every tool in tools/index.ts", () => {
    expect(listed.map((t) => t.name).sort()).toEqual(tools.map((t) => t.name).sort());
  });

  describe.each(listed.map((t) => [t.name, t] as const))("%s", (name, tool) => {
    it("is named verb_noun from the closed verb set", () => {
      expect(name).toMatch(TOOL_NAME_PATTERN);
    });

    it("has a description", () => {
      expect(tool.description?.trim()).toBeTruthy();
    });

    it("describes every parameter", () => {
      for (const [field, schema] of Object.entries(tool.inputSchema.properties ?? {})) {
        expect((schema as { description?: string }).description, field).toBeTruthy();
      }
    });

    it("advertises that unknown fields are rejected", () => {
      expect(tool.inputSchema.additionalProperties).toBe(false);
    });

    it("rejects an unknown field when called", async () => {
      const result = await client.callTool({ name, arguments: { notARealField: true } });
      expect(result.isError).toBe(true);
    });

    it("declares a summary string in its output", () => {
      expect(tool.outputSchema?.properties?.summary).toMatchObject({ type: "string" });
      expect(tool.outputSchema?.required).toContain("summary");
    });
  });
});

describe("defineTool refuses tools that break ADR-002", () => {
  const valid = {
    name: "get_thing",
    description: "Returns a thing.",
    input: {},
    output: {},
    handler: async () => ({ summary: "ok" }),
  };

  it.each(["create_thing", "update_thing", "delete_thing", "run_thing", "getThing", "get"])(
    "rejects the name %s",
    (name) => {
      expect(() => defineTool({ ...valid, name })).toThrow(/ADR-002/);
    },
  );

  it("rejects a missing description", () => {
    expect(() => defineTool({ ...valid, description: " " })).toThrow(/description/);
  });

  it("rejects an undescribed parameter", () => {
    expect(() => defineTool({ ...valid, input: { id: z.string() } })).toThrow(/describe/);
  });
});

describe("tool errors", () => {
  it("come back as isError with a plain message and no stack trace", async () => {
    const failing = defineTool({
      name: "get_failure",
      description: "Always fails.",
      input: {},
      output: {},
      handler: async () => {
        throw new Error("The thing is unavailable.");
      },
    });
    const original = console.error;
    console.error = () => {};
    try {
      const result = await failing.run({}, { version: "x", startedAt: new Date(), now: () => new Date() });
      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toBe("The thing is unavailable.");
      expect(text).not.toMatch(/\n\s+at /);
    } finally {
      console.error = original;
    }
  });
});
