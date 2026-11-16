import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Bun resolves os.homedir() once at startup, so the refresh runs in a child
// process whose HOME points at a scratch dir. The child refuses to run unless
// it really resolves there, so the user's real credentials are never touched.
const CHILD_SCRIPT = `
const { homedir } = require("node:os");
if (homedir() !== process.env.HOME) {
	console.error("homedir() is " + homedir() + ", not the scratch HOME");
	process.exit(2);
}
globalThis.fetch = async () =>
	Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 });
const { refreshClaudeCodeCreds } = await import(process.env.CREDS_MODULE);
const creds = await refreshClaudeCodeCreds({
	accessToken: "old-access",
	refreshToken: "old-refresh",
	expiresAt: 0,
});
console.log(JSON.stringify(creds));
`;

const STORED_METADATA = {
	scopes: ["user:inference", "user:profile"],
	subscriptionType: "max",
	rateLimitTier: "default_claude_max_20x",
};

describe("refreshClaudeCodeCreds", () => {
	let home: string;
	let credsPath: string;

	beforeEach(() => {
		home = mkdtempSync(join(tmpdir(), "claude-code-core-creds-"));
		mkdirSync(join(home, ".claude"));
		credsPath = join(home, ".claude", ".credentials.json");
	});

	afterEach(() => {
		rmSync(home, { recursive: true, force: true });
	});

	function refreshInScratchHome(): { accessToken: string; expiresAt: number } {
		const env: NodeJS.ProcessEnv = {
			...process.env,
			HOME: home,
			CREDS_MODULE: join(import.meta.dir, "creds.ts"),
		};
		delete env.CLAUDE_CONFIG_DIR;
		const child = spawnSync(process.execPath, ["-e", CHILD_SCRIPT], { encoding: "utf-8", env });
		if (child.status !== 0)
			throw new Error(`refresh child exited ${child.status}: ${child.stderr}`);
		return JSON.parse(child.stdout);
	}

	test("write-back keeps the OAuth fields Claude Code stores besides the tokens", () => {
		writeFileSync(
			credsPath,
			JSON.stringify({
				claudeAiOauth: {
					accessToken: "old-access",
					refreshToken: "old-refresh",
					expiresAt: 0,
					...STORED_METADATA,
				},
				otherKey: { kept: true },
			}),
		);

		const creds = refreshInScratchHome();

		expect(creds.accessToken).toBe("new-access");
		const written = JSON.parse(readFileSync(credsPath, "utf-8"));
		expect(written.otherKey).toEqual({ kept: true });
		expect(written.claudeAiOauth).toEqual({
			accessToken: "new-access",
			refreshToken: "new-refresh",
			expiresAt: creds.expiresAt,
			...STORED_METADATA,
		});
	});

	test("write-back leaves a stored login for a different refresh token alone", () => {
		const stored = {
			claudeAiOauth: {
				accessToken: "other-access",
				refreshToken: "other-refresh",
				expiresAt: 0,
				...STORED_METADATA,
			},
		};
		writeFileSync(credsPath, JSON.stringify(stored));

		const creds = refreshInScratchHome();

		expect(creds.accessToken).toBe("new-access");
		expect(JSON.parse(readFileSync(credsPath, "utf-8"))).toEqual(stored);
	});

	test("write-back creates the login when none is stored", () => {
		const creds = refreshInScratchHome();

		expect(JSON.parse(readFileSync(credsPath, "utf-8")).claudeAiOauth).toEqual({
			accessToken: "new-access",
			refreshToken: "new-refresh",
			expiresAt: creds.expiresAt,
		});
	});
});
