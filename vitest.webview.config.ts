import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	test: {
		include: ["tests/webview/**/*.test.{ts,tsx}"],
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/webview/setup.ts"],
		css: true,
	},
	esbuild: {
		jsx: "automatic",
	},
	resolve: {
		alias: {
			"@shared": path.resolve(__dirname, "src/shared"),
			"@src": path.resolve(__dirname, "src"),
		},
	},
});
