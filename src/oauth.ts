export const OAUTH_TOKEN_URL = "https://claude.ai/v1/oauth/token";
export const OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";

export interface ClaudeCodeCreds {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

interface OAuthResponse {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number | string;
}

export async function refreshClaudeCodeCreds(
	refreshToken: string,
): Promise<ClaudeCodeCreds | null> {
	const body = new URLSearchParams({
		grant_type: "refresh_token",
		client_id: OAUTH_CLIENT_ID,
		refresh_token: refreshToken,
	});
	const res = await fetch(OAUTH_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});
	if (!res.ok) return null;
	const data = (await res.json()) as OAuthResponse;
	if (!data.access_token) return null;
	const ttlSec = Number(data.expires_in);
	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token ?? refreshToken,
		expiresAt: Date.now() + (Number.isFinite(ttlSec) && ttlSec > 0 ? ttlSec : 36_000) * 1000,
	};
}
