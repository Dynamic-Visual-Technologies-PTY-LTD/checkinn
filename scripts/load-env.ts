// Loads `.env.local`, then `.env`, for scripts, with Next's precedence
// (AD-29): shell > `.env.local` > `.env`. `process.loadEnvFile` never
// overwrites a variable that is already set, so the file loaded first wins.
// Each file is optional.
import { existsSync } from "node:fs";
import path from "node:path";

export function loadEnv(root: string = process.cwd()): void {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(root, name);
    if (existsSync(file)) process.loadEnvFile(file);
  }
}
