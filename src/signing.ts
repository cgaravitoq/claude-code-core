const BILLING_SALT = "59cf53e54c78";
const encoder = new TextEncoder();

interface Message {
	role?: string;
	content?: string | Array<{ type?: string; text?: string }>;
}

function extractFirstUserMessageText(messages: Message[]): string {
	const userMsg = messages.find((m) => m.role === "user");
	if (!userMsg) return "";
	const content = userMsg.content;
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		const textBlock = content.find((b) => b.type === "text");
		if (textBlock && textBlock.type === "text" && textBlock.text) {
			return textBlock.text;
		}
	}
	return "";
}

async function computeHashPrefix(value: string, length: number): Promise<string> {
	const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(value));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, length);
}

async function computeCch(messageText: string): Promise<string> {
	return computeHashPrefix(messageText, 5);
}

async function computeVersionSuffix(messageText: string, version: string): Promise<string> {
	const sampled = [4, 7, 20].map((i) => (i < messageText.length ? messageText[i] : "0")).join("");
	const input = `${BILLING_SALT}${sampled}${version}`;
	return computeHashPrefix(input, 3);
}

export async function buildBillingHeaderValue(
	messages: Message[],
	version: string,
	entrypoint: string,
): Promise<string> {
	const text = extractFirstUserMessageText(messages);
	const [suffix, cch] = await Promise.all([computeVersionSuffix(text, version), computeCch(text)]);
	return (
		`x-anthropic-billing-header: ` +
		`cc_version=${version}.${suffix}; ` +
		`cc_entrypoint=${entrypoint}; ` +
		`cch=${cch};`
	);
}
