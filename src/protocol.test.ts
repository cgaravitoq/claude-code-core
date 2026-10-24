import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import * as protocol from "./protocol.ts";

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
		const bundle = readFileSync(new URL("../dist/protocol.js", import.meta.url), "utf8");
		expect(bundle).not.toMatch(/node:/);
	});
});
