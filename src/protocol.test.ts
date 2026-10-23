import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import * as protocol from "@cgaravitoq/claude-code-core/protocol";

describe("protocol subpath", () => {
	test("imports from the package subpath under Bun", () => {
		expect(protocol.computeBetas).toBeFunction();
		expect(protocol.buildBillingHeaderValue).toBeFunction();
		expect(protocol.applyClaudeCodeTransforms).toBeFunction();
		expect(protocol.refreshClaudeCodeCreds).toBeFunction();
	});

	test("built protocol bundle has no node specifier", async () => {
		const bundle = await readFile(new URL("../dist/protocol.js", import.meta.url), "utf8");
		expect(bundle).not.toMatch(/node:/);
	});
});
