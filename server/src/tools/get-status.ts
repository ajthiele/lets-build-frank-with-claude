import { z } from "zod";
import { defineTool } from "./define.js";

export const getStatus = defineTool({
  name: "get_status",
  description:
    "Returns Frank's version, how long he has been running, and a greeting. Use it to check that Frank is reachable and which build is deployed. It reports only on Frank himself, not on Azure or anything else.",
  input: {},
  output: {
    version: z.string().describe("Frank's package version."),
    uptimeSeconds: z.number().int().nonnegative().describe("Seconds since this Frank process started."),
    greeting: z.string().describe("A short hello from Frank."),
  },
  async handler(_args, ctx) {
    const uptimeSeconds = Math.max(0, Math.floor((ctx.now().getTime() - ctx.startedAt.getTime()) / 1000));
    return {
      summary: `Frank ${ctx.version} is up and has been running for ${uptimeSeconds} second${uptimeSeconds === 1 ? "" : "s"}.`,
      version: ctx.version,
      uptimeSeconds,
      greeting: "Hello, I'm Frank. I can look, but I don't touch.",
    };
  },
});
