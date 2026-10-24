import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as protocol from "./protocol.ts";

function readStaticImportGraph(entryPath: string, visited = new Set<string>()): string[] {
	const path = resolve(entryPath);
	if (visited.has(path)) return [];
	visited.add(path);
	const source = readFileSync(path, "utf8");
	const imports = Array.from(source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g));
	return [
		source,
		...imports.flatMap((match) => {
			const specifier = match[1];
			if (!specifier?.startsWith(".")) return [];
			const importedPath = resolve(dirname(path), specifier);
			return existsSync(importedPath) ? readStaticImportGraph(importedPath, visited) : [];
		}),
	];
}

describe("protocol subpath", () => {
	beforeAll(() => {
		if (existsSync(new URL("../dist/protocol.js", import.meta.url))) return;
		const result = Bun.spawnSync(["bun", "run", "build"], {
			cwd: new URL("..", import.meta.url).pathname,
		});
		if (result.exitCode !== 0) {
			throw new Error(new TextDecoder().decode(result.stderr));
		}
	});

	test("imports protocol exports from the source module under Bun", () => {
		expect(protocol.computeBetas).toBeFunction();
		expect(protocol.buildBillingHeaderValue).toBeFunction();
		expect(protocol.applyClaudeCodeTransforms).toBeFunction();
		expect(protocol.refreshClaudeCodeCreds).toBeFunction();
	});

	test("built protocol bundle has no node specifier", () => {
		const entryPath = fileURLToPath(new URL("../dist/protocol.js", import.meta.url));
		const modules = readStaticImportGraph(entryPath);
		expect(modules.length).toBeGreaterThan(1);
		for (const source of modules) expect(source).not.toMatch(/node:/);
	});
});
