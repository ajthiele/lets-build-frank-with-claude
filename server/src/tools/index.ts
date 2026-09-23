import type { Tool } from "./define.js";
import { getStatus } from "./get-status.js";

// Every tool Frank exposes. A tool that is not listed here does not exist.
export const tools: readonly Tool[] = [getStatus];
