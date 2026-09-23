import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "../src/app.js";
import { fixedContext } from "./helpers.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function emptyDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "frank-console-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

async function start(consoleDir: string): Promise<string> {
  const app = createApp({ consoleDir, context: fixedContext() });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  cleanups.push(() => server.close());
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("Frank over HTTP", () => {
  it("answers GET /healthz with 200", async () => {
    const base = await start(emptyDir());
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
  });

  it("serves MCP to one client across several requests, statelessly", async () => {
    const base = await start(emptyDir());
    const client = new Client({ name: "frank-test", version: "0.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    cleanups.push(() => void client.close());

    // The console keeps one client and makes many calls, each landing on a
    // fresh server instance. Prove that works, not just a single call.
    for (let i = 0; i < 3; i++) {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).toContain("get_status");
      const result = await client.callTool({ name: "get_status", arguments: {} });
      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toMatchObject({ summary: expect.any(String) });
    }
  });

  it("refuses GET and DELETE on /mcp, since there are no sessions", async () => {
    const base = await start(emptyDir());
    for (const method of ["GET", "DELETE"]) {
      const res = await fetch(`${base}/mcp`, { method });
      expect(res.status, method).toBe(405);
    }
  });

  it("says the console is not built yet when there is no console", async () => {
    const base = await start(emptyDir());
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/console has not been built yet/);
  });

  it("serves the console at / once it exists", async () => {
    const dir = emptyDir();
    writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>Frank console</title>");
    const base = await start(dir);
    const res = await fetch(`${base}/`);
    expect(await res.text()).toContain("Frank console");
  });
});
