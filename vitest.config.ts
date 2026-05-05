import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
	plugins: [react()],
	test: {
		include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
		environment: "jsdom",
		globals: true,
		setupFiles: ["tests/webview/setup.ts"],
	},
	resolve: {
		alias: {
			"@shared": path.resolve(__dirname, "src/shared"),
			"@src": path.resolve(__dirname, "src"),
		},
	},
});
