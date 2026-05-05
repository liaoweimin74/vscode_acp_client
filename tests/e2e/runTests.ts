import { resolve } from "node:path";
import { runTests } from "@vscode/test-electron";

const extensionDevelopmentPath = resolve(__dirname, "../..");
const extensionTestsPath = resolve(__dirname, "./suite/index");

async function main() {
	try {
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				resolve(__dirname, "../../src"),
				"--disable-workspace-trust",
			],
		});
	} catch (err) {
		console.error("Failed to run tests:", err);
		process.exit(1);
	}
}

main();
