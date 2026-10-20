// @vitest-environment node
// The import guard (AD-19): only `src/features/search` imports `provider/`,
// and only `provider/azure.ts` imports the `openai` SDK. `scripts/search-*.ts`
// may import `provider/` too, but this guard scans `src/` only.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const src = path.join(root, "src");
const searchDir = path.join(src, "features", "search");
const providerDir = path.join(searchDir, "provider");
const azureFile = path.join(providerDir, "azure.ts");

/** Every module specifier in `source`: static, side-effect, dynamic and require. */
function specifiers(source: string): string[] {
  const patterns = [
    /\b(?:import|export)\b[^'"`;]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]));
}

/** Where `specifier` points, as an absolute path, or null for a package. */
function resolve(file: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) return path.join(src, specifier.slice(2));
  if (specifier.startsWith(".")) return path.resolve(path.dirname(file), specifier);
  return null;
}

function isWithin(dir: string, target: string): boolean {
  const relative = path.relative(dir, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isOpenai(specifier: string): boolean {
  return specifier === "openai" || specifier.startsWith("openai/");
}

/** The guard's verdict for one file: a message per forbidden import. */
function violations(file: string, source: string): string[] {
  const name = path.relative(root, file).split(path.sep).join("/");
  return specifiers(source).flatMap((specifier) => {
    if (isOpenai(specifier)) {
      return file === azureFile ? [] : [`${name} imports "${specifier}"`];
    }
    const target = resolve(file, specifier);
    if (target && isWithin(providerDir, target) && !isWithin(searchDir, file)) {
      return [`${name} imports "${specifier}"`];
    }
    return [];
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe("the Provider import guard", () => {
  it("finds no import of provider/ outside src/features/search, nor of openai outside azure.ts", () => {
    // This file is skipped: its examples below are strings, not imports.
    const guard = path.join(providerDir, "imports.test.ts");
    const found = sourceFiles(src)
      .filter((file) => file !== guard)
      .flatMap((file) => violations(file, readFileSync(file, "utf8")));
    expect(found).toEqual([]);
  });

  it("names a file outside src/features/search that imports provider/", () => {
    const page = path.join(src, "app", "page.tsx");
    expect(
      violations(page, 'import { getProvider } from "@/features/search/provider/config";'),
    ).toEqual(['src/app/page.tsx imports "@/features/search/provider/config"']);
    const card = path.join(src, "components", "card.tsx");
    expect(violations(card, 'export * from "../features/search/provider/types";')).toEqual([
      'src/components/card.tsx imports "../features/search/provider/types"',
    ]);
    expect(violations(page, 'const p = await import("@/features/search/provider");')).toHaveLength(
      1,
    );
  });

  it("allows provider/ imports inside src/features/search", () => {
    const actions = path.join(searchDir, "actions.ts");
    expect(violations(actions, 'import { getProvider } from "./provider/config";')).toEqual([]);
    expect(
      violations(actions, 'import type { Provider } from "@/features/search/provider/types";'),
    ).toEqual([]);
  });

  it("names any file but provider/azure.ts that imports openai", () => {
    const fake = path.join(providerDir, "fake.ts");
    expect(violations(fake, 'import OpenAI from "openai";')).toEqual([
      'src/features/search/provider/fake.ts imports "openai"',
    ]);
    expect(violations(fake, 'import type { Responses } from "openai/resources";')).toHaveLength(1);
    expect(violations(azureFile, 'import OpenAI, { RateLimitError } from "openai";')).toEqual([]);
  });

  it("reads multi-line and type-only imports", () => {
    const page = path.join(src, "app", "page.tsx");
    const source = 'import type {\n  Provider,\n  ProviderError,\n} from "@/features/search/provider/types";';
    expect(violations(page, source)).toHaveLength(1);
  });
});
