import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// ADR-002 is enforced here, once, rather than remembered in every tool.

/** The closed verb set. Anything that writes needs a new ADR, not a new verb. */
export const TOOL_VERBS = ["get", "list", "search", "summarize"] as const;

export const TOOL_NAME_PATTERN = new RegExp(`^(${TOOL_VERBS.join("|")})_[a-z0-9]+(_[a-z0-9]+)*$`);

/** What a tool may know about the running Frank. */
export interface ToolContext {
  version: string;
  startedAt: Date;
  now: () => Date;
}

type Output<O extends z.ZodRawShape> = z.infer<z.ZodObject<{ summary: z.ZodString } & O>>;

export interface ToolSpec<I extends z.ZodRawShape, O extends z.ZodRawShape> {
  name: string;
  /** For a model deciding whether to call it: what it returns, when, and its limits. */
  description: string;
  /** Every field needs .describe(). Unknown fields are rejected. */
  input: I;
  /** Typed detail fields. `summary` is added for you. */
  output: O;
  handler: (args: z.infer<z.ZodObject<I>>, ctx: ToolContext) => Promise<Output<O>>;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  outputSchema: z.ZodObject<z.ZodRawShape>;
  run: (args: unknown, ctx: ToolContext) => Promise<CallToolResult>;
}

export function defineTool<I extends z.ZodRawShape, O extends z.ZodRawShape>(
  spec: ToolSpec<I, O>,
): Tool {
  if (!TOOL_NAME_PATTERN.test(spec.name)) {
    throw new Error(
      `Tool name "${spec.name}" breaks ADR-002: use verb_noun with a verb from ${TOOL_VERBS.join(", ")}`,
    );
  }
  if (!spec.description.trim()) {
    throw new Error(`Tool "${spec.name}" needs a description (ADR-002)`);
  }
  for (const [field, schema] of Object.entries(spec.input)) {
    if (!(schema as z.ZodType).description) {
      throw new Error(`Parameter "${field}" of tool "${spec.name}" needs a .describe() (ADR-002)`);
    }
  }

  // A full strict object, not a raw shape: given a raw shape the SDK builds a
  // plain z.object(), which silently strips unknown fields instead of rejecting them.
  const inputSchema = z.object(spec.input).strict();
  const outputSchema = z.object({
    summary: z.string().describe("One or two plain sentences a person or model can read."),
    ...spec.output,
  });

  return {
    name: spec.name,
    description: spec.description,
    inputSchema,
    outputSchema,
    async run(args, ctx) {
      try {
        const result = await spec.handler(args as z.infer<z.ZodObject<I>>, ctx);
        return {
          // Older clients read content; newer ones read structuredContent.
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (err) {
        // The detail goes to the log. The caller gets a plain message, never a stack.
        console.error(`tool ${spec.name} failed:`, err);
        const message = err instanceof Error ? err.message : "Frank could not complete that request.";
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    },
  };
}
