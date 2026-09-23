import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import createWrapper from "@cloudscape-design/components/test-utils/dom";
import { fieldKind, SchemaForm, toArguments } from "../src/components/SchemaForm";
import type { JsonSchema } from "../src/mcp";

const schema: JsonSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", description: "Who to look up." },
    limit: { type: "integer", description: "How many." },
    verbose: { type: "boolean", description: "Say more." },
    region: { type: "string", enum: ["eastus", "westus"], description: "Where." },
    filter: { type: "object", description: "Anything nested." },
  },
};

describe("fieldKind", () => {
  it.each([
    [{ type: "string" }, "string"],
    [{ type: "number" }, "number"],
    [{ type: "integer" }, "integer"],
    [{ type: "boolean" }, "boolean"],
    [{ type: "string", enum: ["a", "b"] }, "enum"],
    [{ type: ["string", "null"] }, "string"],
    [{ type: "object" }, "json"],
    [{ type: "array", items: { type: "string" } }, "json"],
  ] as const)("maps %j to %s", (s, kind) => {
    expect(fieldKind(s as JsonSchema)).toBe(kind);
  });
});

describe("toArguments", () => {
  it("parses each kind and leaves out empty optional fields", () => {
    const { args, errors } = toArguments(schema, {
      name: "frank",
      limit: "5",
      verbose: true,
      region: "",
      filter: '{"tag":"x"}',
    });
    expect(errors).toEqual({});
    expect(args).toEqual({ name: "frank", limit: 5, verbose: true, filter: { tag: "x" } });
  });

  it("reports a missing required field, a bad integer and bad JSON", () => {
    const { errors } = toArguments(schema, { name: "", limit: "1.5", verbose: false, region: "", filter: "{" });
    expect(errors).toEqual({ name: "Required.", limit: "Enter a whole number.", filter: "Enter valid JSON." });
  });
});

describe("SchemaForm", () => {
  it("renders a Cloudscape control for every field type", () => {
    const { container } = render(<SchemaForm schema={schema} submitting={false} onSubmit={() => {}} />);
    const w = createWrapper(container);
    expect(w.findAllInputs()).toHaveLength(2); // name, limit
    expect(w.findCheckbox()).not.toBeNull(); // verbose
    expect(w.findSelect()).not.toBeNull(); // region
    expect(w.findTextarea()).not.toBeNull(); // filter
    expect(screen.getByText("Who to look up.")).toBeInTheDocument();
    expect(screen.getByText("limit (optional)")).toBeInTheDocument();
  });

  it("submits typed arguments", async () => {
    const onSubmit = vi.fn();
    const { container } = render(<SchemaForm schema={schema} submitting={false} onSubmit={onSubmit} />);
    const w = createWrapper(container);
    const [name, limit] = w.findAllInputs();
    name.setInputValue("frank");
    limit.setInputValue("3");
    w.findCheckbox()!.findNativeInput().click();
    const select = w.findSelect()!;
    select.openDropdown();
    select.selectOption(2);

    await userEvent.click(screen.getByRole("button", { name: "Call tool" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "frank", limit: 3, verbose: true, region: "westus" });
  });

  it("does not submit while a required field is empty", async () => {
    const onSubmit = vi.fn();
    render(<SchemaForm schema={schema} submitting={false} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Call tool" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Required.")).toBeInTheDocument();
  });

  it("says so when a tool takes no input, and still submits", async () => {
    const onSubmit = vi.fn();
    render(<SchemaForm schema={{ type: "object", properties: {} }} submitting={false} onSubmit={onSubmit} />);
    expect(screen.getByText("This tool takes no input.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Call tool" }));
    expect(onSubmit).toHaveBeenCalledWith({});
  });
});
