import { useState, type FormEvent } from "react";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import type { JsonSchema } from "../mcp";

// Renders a form from a tool's input schema, so a new tool shows up here with
// no UI work (ADR-003). Anything beyond a flat scalar falls back to raw JSON.

type Kind = "string" | "number" | "integer" | "boolean" | "enum" | "json";

export function fieldKind(schema: JsonSchema): Kind {
  if (Array.isArray(schema.enum) && schema.enum.every((v) => typeof v === "string")) return "enum";
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
  if (type === "string" || type === "number" || type === "integer" || type === "boolean") return type;
  return "json";
}

function initialValue(schema: JsonSchema): string | boolean {
  const kind = fieldKind(schema);
  if (kind === "boolean") return schema.default === true;
  if (schema.default === undefined) return "";
  return kind === "json" ? JSON.stringify(schema.default, null, 2) : String(schema.default);
}

/** Turns the form's raw values into tool arguments, or per-field errors. */
export function toArguments(
  schema: JsonSchema,
  values: Record<string, string | boolean>,
): { args: Record<string, unknown>; errors: Record<string, string> } {
  const args: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const required = new Set(schema.required ?? []);

  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const kind = fieldKind(prop);
    const raw = values[name];

    if (kind === "boolean") {
      args[name] = raw === true;
      continue;
    }
    if (raw === "" || raw === undefined) {
      if (required.has(name)) errors[name] = "Required.";
      continue; // optional and empty: leave it out rather than send ""
    }
    const text = String(raw);

    if (kind === "number" || kind === "integer") {
      const n = Number(text);
      if (!Number.isFinite(n) || (kind === "integer" && !Number.isInteger(n))) {
        errors[name] = kind === "integer" ? "Enter a whole number." : "Enter a number.";
      } else {
        args[name] = n;
      }
    } else if (kind === "json") {
      try {
        args[name] = JSON.parse(text);
      } catch {
        errors[name] = "Enter valid JSON.";
      }
    } else {
      args[name] = text;
    }
  }
  return { args, errors };
}

interface Props {
  schema: JsonSchema;
  submitting: boolean;
  onSubmit: (args: Record<string, unknown>) => void;
}

export function SchemaForm({ schema, submitting, onSubmit }: Props) {
  const properties = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(properties.map(([name, prop]) => [name, initialValue(prop)])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const result = toArguments(schema, values);
    setErrors(result.errors);
    if (Object.keys(result.errors).length === 0) onSubmit(result.args);
  }

  return (
    <form onSubmit={submit}>
      <Form
        actions={
          <Button variant="primary" formAction="submit" loading={submitting}>
            Call tool
          </Button>
        }
      >
        <SpaceBetween size="m">
          {properties.length === 0 && <Box color="text-body-secondary">This tool takes no input.</Box>}
          {properties.map(([name, prop]) => {
            const kind = fieldKind(prop);
            const value = values[name];
            return (
              <FormField
                key={name}
                label={required.has(name) ? name : `${name} (optional)`}
                description={prop.description}
                errorText={errors[name]}
              >
                {kind === "boolean" ? (
                  <Checkbox checked={value === true} onChange={({ detail }) => set(name, detail.checked)}>
                    {name}
                  </Checkbox>
                ) : kind === "enum" ? (
                  <Select
                    selectedOption={value ? { label: String(value), value: String(value) } : null}
                    options={(prop.enum as string[]).map((v) => ({ label: v, value: v }))}
                    onChange={({ detail }) => set(name, detail.selectedOption.value ?? "")}
                    placeholder="Choose a value"
                  />
                ) : kind === "json" ? (
                  <Textarea value={String(value)} onChange={({ detail }) => set(name, detail.value)} placeholder="JSON" />
                ) : (
                  <Input
                    type={kind === "string" ? "text" : "number"}
                    value={String(value)}
                    onChange={({ detail }) => set(name, detail.value)}
                  />
                )}
              </FormField>
            );
          })}
        </SpaceBetween>
      </Form>
    </form>
  );
}
