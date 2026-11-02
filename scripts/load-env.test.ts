// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { loadEnv } from "./load-env";

const NAME = "CHECKINN_LOAD_ENV_TEST";
let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "checkinn-load-env-"));
  delete process.env[NAME];
});
afterEach(() => {
  delete process.env[NAME];
  rmSync(root, { recursive: true, force: true });
});

it("lets .env.local win over .env", () => {
  writeFileSync(path.join(root, ".env"), `${NAME}=from-env\n`);
  writeFileSync(path.join(root, ".env.local"), `${NAME}=from-env-local\n`);
  loadEnv(root);
  expect(process.env[NAME]).toBe("from-env-local");
});

it("uses .env when there is no .env.local", () => {
  writeFileSync(path.join(root, ".env"), `${NAME}=from-env\n`);
  loadEnv(root);
  expect(process.env[NAME]).toBe("from-env");
});

it("never overwrites a variable set in the shell", () => {
  process.env[NAME] = "from-shell";
  writeFileSync(path.join(root, ".env.local"), `${NAME}=from-env-local\n`);
  loadEnv(root);
  expect(process.env[NAME]).toBe("from-shell");
});

it("does nothing without either file", () => {
  loadEnv(root);
  expect(process.env[NAME]).toBeUndefined();
});
