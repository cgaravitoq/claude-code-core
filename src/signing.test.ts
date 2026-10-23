import { describe, expect, test } from "bun:test";
import { buildBillingHeaderValue } from "./signing.ts";

type Message = { role?: string; content?: string | Array<{ type?: string; text?: string }> };

function expectBillingHeader(value: string) {
	expect(value).toMatch(
		/^x-anthropic-billing-header: cc_version=\d+\.\d+\.\d+\.[a-f0-9]{3}; cc_entrypoint=[^;]+; cch=[a-f0-9]{5};$/,
	);
}

describe("buildBillingHeaderValue", () => {
	test("empty messages are deterministic and do not throw", async () => {
		const value = await buildBillingHeaderValue([], "2.1.112", "sdk-cli");

		expectBillingHeader(value);
		expect(value).toBe(await buildBillingHeaderValue([], "2.1.112", "sdk-cli"));
		expect(value).toBe(
			"x-anthropic-billing-header: cc_version=2.1.112.b02; cc_entrypoint=sdk-cli; cch=e3b0c;",
		);
	});

	test("single user text message is deterministic and idempotent", async () => {
		const messages: Message[] = [{ role: "user", content: "hello" }];
		const first = await buildBillingHeaderValue(messages, "2.1.112", "sdk-cli");
		const second = await buildBillingHeaderValue(messages, "2.1.112", "sdk-cli");

		expectBillingHeader(first);
		expect(second).toBe(first);
		expect(first).toBe(
			"x-anthropic-billing-header: cc_version=2.1.112.e61; cc_entrypoint=sdk-cli; cch=2cf24;",
		);
	});

	test("only the first user message text influences output", async () => {
		const base: Message[] = [
			{ role: "assistant", content: "ignored" },
			{ role: "user", content: "first" },
			{ role: "user", content: "second" },
		];
		const changedLaterMessages: Message[] = [
			{ role: "assistant", content: "changed" },
			{ role: "user", content: "first" },
			{ role: "user", content: "changed" },
		];

		expect(await buildBillingHeaderValue(changedLaterMessages, "2.1.112", "sdk-cli")).toBe(
			await buildBillingHeaderValue(base, "2.1.112", "sdk-cli"),
		);
	});

	test("same input twice returns identical output", async () => {
		const messages: Message[] = [{ role: "user", content: [{ type: "text", text: "hello" }] }];

		expect(await buildBillingHeaderValue(messages, "2.1.112", "sdk-cli")).toBe(
			await buildBillingHeaderValue(messages, "2.1.112", "sdk-cli"),
		);
		expect(
			await buildBillingHeaderValue(
				[{ role: "user", content: "a longer prompt with sampling chars" }],
				"2.1.280",
				"agent-sdk",
			),
		).toBe(
			"x-anthropic-billing-header: cc_version=2.1.280.d87; cc_entrypoint=agent-sdk; cch=b9741;",
		);
	});
});
