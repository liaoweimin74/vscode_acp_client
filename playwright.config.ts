import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	testMatch: "*.spec.ts",
	fullyParallel: true,
	retries: 0,
	workers: 1,
	reporter: "list",
	use: {
		baseURL: "http://localhost:5178",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npx vite --config tests/e2e-ui/vite.config.ts",
		port: 5178,
		reuseExistingServer: true,
	},
});
