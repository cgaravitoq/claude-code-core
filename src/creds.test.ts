import { describe, expect, test } from "bun:test";
import { type ClaudeCodeCreds, mergeCredentialBlob } from "./creds.ts";

const fresh: ClaudeCodeCreds = {
	accessToken: "access-new",
	refreshToken: "refresh-new",
	expiresAt: 2_000,
};

describe("mergeCredentialBlob", () => {
	test("rotates the token fields", () => {
		const merged = mergeCredentialBlob(
			{ claudeAiOauth: { accessToken: "access-old", refreshToken: "refresh-old", expiresAt: 1 } },
			fresh,
		);

		expect(merged.claudeAiOauth).toEqual({
			accessToken: "access-new",
			refreshToken: "refresh-new",
			expiresAt: 2_000,
		});
	});

	test("preserves unknown keys the CLI depends on", () => {
		const merged = mergeCredentialBlob(
			{
				claudeAiOauth: {
					accessToken: "access-old",
					refreshToken: "refresh-old",
					expiresAt: 1,
					scopes: ["user:inference", "user:profile"],
					subscriptionType: "max",
				},
			},
			fresh,
		);

		expect(merged.claudeAiOauth).toMatchObject({
			accessToken: "access-new",
			scopes: ["user:inference", "user:profile"],
			subscriptionType: "max",
		});
	});

	test("preserves sibling top-level keys", () => {
		const merged = mergeCredentialBlob({ someOtherProvider: { token: "keep" } }, fresh);

		expect(merged.someOtherProvider).toEqual({ token: "keep" });
	});

	test("accepts a blob without a claudeAiOauth object", () => {
		for (const existing of [{}, { claudeAiOauth: null }, { claudeAiOauth: "corrupt" }]) {
			expect(mergeCredentialBlob(existing, fresh).claudeAiOauth).toEqual({
				accessToken: "access-new",
				refreshToken: "refresh-new",
				expiresAt: 2_000,
			});
		}
	});

	test("does not mutate the input blob", () => {
		const existing = { claudeAiOauth: { accessToken: "access-old", scopes: ["user:inference"] } };
		mergeCredentialBlob(existing, fresh);

		expect(existing.claudeAiOauth.accessToken).toBe("access-old");
	});
});
