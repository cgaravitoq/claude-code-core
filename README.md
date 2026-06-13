# @cgaravitoq/claude-code-core

Framework-agnostic core for using the **Claude Code OAuth subscription** as an Anthropic
provider. No Pi, no LangChain — just the native stack, with **zero runtime dependencies**.

It exists so the Claude Code internals live in one place and are shared by
[`@cgaravitoq/open-langchain-ts`](https://github.com/cgaravitoq/open-langchain-ts) and the
[`pi-claude-code-auth`](https://github.com/cgaravitoq/pi-claude-code-auth) Pi extension.

## What's inside

- **creds** — read/refresh `~/.claude/.credentials.json` (and macOS Keychain), with a
  `claude` CLI fallback and a force-refresh path for 401s.
- **signing** — the reverse-engineered `x-anthropic-billing-header`.
- **model-config** — `ccVersion`, beta computation (`computeBetas`/`requestBetas`) and frozen
  per-model overrides (adaptive thinking, long context, etc.).
- **transforms** — Claude Code payload reshaping: billing header injection, identity split,
  `mcp_<PascalCase>` tool prefixing, and orphan tool-pair repair.

## Install

```sh
npm install @cgaravitoq/claude-code-core
```

ESM-only, **Node >= 22.19.0**.

## Usage

```ts
import {
  readClaudeCodeCreds,
  refreshClaudeCodeCreds,
  applyClaudeCodeTransforms,
  requestBetas,
} from "@cgaravitoq/claude-code-core";

const creds = readClaudeCodeCreds();
if (creds) {
  const fresh = await refreshClaudeCodeCreds(creds);
  // build your Anthropic request, then:
  const params = applyClaudeCodeTransforms(rawParams);
  // send with "anthropic-beta": requestBetas(model, longContext).join(",")
}
```

This is the building block, not a chat client — see the consumers above for ready-to-use
LangChain chat models or a Pi provider.

## Notes

Using a subscription OAuth session from a third-party app may violate Anthropic's terms and
risk your account.

## License

MIT
