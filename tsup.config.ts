import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/protocol.ts"],
	format: ["esm"],
	dts: true,
	target: "node22",
	clean: true,
	sourcemap: true,
});
