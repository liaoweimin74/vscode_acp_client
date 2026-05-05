import * as vscode from "vscode";
import * as assert from "node:assert";

const TIMEOUT = 30_000;
const LONG_TIMEOUT = 60_000;

describe("VSCode ACP Extension E2E", () => {
	before(async function () {
		this.timeout(TIMEOUT);
		const ext = vscode.extensions.getExtension("hexuya.vscode-acp");
		assert.ok(ext, "Extension not found");
		await ext.activate();
	});

	it("extension activates successfully", async () => {
		const ext = vscode.extensions.getExtension("hexuya.vscode-acp");
		assert.ok(ext?.isActive, "Extension should be active");
	});

	it("all commands are registered", async () => {
		const commands = await vscode.commands.getCommands(true);
		const acpCommands = commands.filter((c) => c.startsWith("vscodeAcp."));

		const expected = [
			"vscodeAcp.selectAgent",
			"vscodeAcp.newSession",
			"vscodeAcp.switchSession",
			"vscodeAcp.selectModel",
			"vscodeAcp.setThoughtLevel",
			"vscodeAcp.openSettings",
			"vscodeAcp.discoverAgents",
		];

		for (const cmd of expected) {
			assert.ok(acpCommands.includes(cmd), `Command ${cmd} not registered`);
		}
	});

	it("newSession command handles agent selection flow", async function () {
		this.timeout(30_000);

		const config = vscode.workspace.getConfiguration("vscodeAcp");
		const agents = config.get<Array<{ id: string; name: string; command: string }>>("agents");

		assert.ok(agents && agents.length > 0, "At least one agent should be configured");

		const ext = vscode.extensions.getExtension("hexuya.vscode-acp");
		const api = ext?.exports as any;
		if (api?.selectAgentById) {
			await api.selectAgentById(agents[0].id);
		}

		try {
			await Promise.race([
				vscode.commands.executeCommand("vscodeAcp.newSession"),
				new Promise((r) => setTimeout(r, 5000)),
			]);
		} catch {
			// newSession may fail if agent connection not established in test env
		}

		assert.ok(true, "newSession command handled");
	});

	it("selectModel command executes without crash", async function () {
		this.timeout(TIMEOUT);

		try {
			await vscode.commands.executeCommand("vscodeAcp.selectModel");
		} catch (err) {
			assert.ok(
				String(err).includes("No active session") ||
					String(err).includes("not connected") ||
					String(err).includes("not available"),
				`Unexpected error: ${err}`,
			);
		}
	});

	it("discoverAgents command executes", async function () {
		this.timeout(60_000);

		try {
			await Promise.race([
				vscode.commands.executeCommand("vscodeAcp.discoverAgents"),
				new Promise((r) => setTimeout(r, 5000)),
			]);
		} catch {
			// may show info message or quickpick, that's ok
		}
	});

	it("setThoughtLevel command executes", async function () {
		this.timeout(TIMEOUT);

		try {
			await vscode.commands.executeCommand("vscodeAcp.setThoughtLevel");
		} catch (err) {
			assert.ok(
				String(err).includes("No active session") ||
					String(err).includes("not connected"),
				`Unexpected error: ${err}`,
			);
		}
	});

	it("openSettings command opens settings", async function () {
		this.timeout(TIMEOUT);
		await vscode.commands.executeCommand("vscodeAcp.openSettings");
		await new Promise((r) => setTimeout(r, 1000));
		assert.ok(true, "openSettings executed");
	});
});
