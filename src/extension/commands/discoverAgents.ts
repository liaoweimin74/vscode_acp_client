import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import { execFile } from "node:child_process";
import type { CommandContext } from "./index.js";
import type { RegistryAgent } from "../../shared/types/registry.js";
import { RegistryService } from "../RegistryService.js";

export function registerDiscoverAgents(ctx: CommandContext): vscode.Disposable {
	const registryService = new RegistryService();

	return vscode.commands.registerCommand("vscodeAcp.discoverAgents", async () => {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Window,
				title: "Fetching agent registry...",
				cancellable: false,
			},
			async () => {
				try {
					const agents = await registryService.getAgents();
					const platform = registryService.getPlatform();

					const items = agents.map((agent) => {
						const available = isAvailable(agent, platform);
						return {
							label: agent.name,
							description: `v${agent.version}`,
							detail: available
								? `$(check) ${agent.description}`
								: `$(circle-slash) Not available for ${platform}`,
							agent,
							available,
						};
					});

					const picked = await vscode.window.showQuickPick(items, {
						placeHolder: "Select an agent to install",
						title: "ACP: Discover Agents",
						matchOnDescription: true,
						matchOnDetail: true,
					});

					if (picked && picked.available) {
						await installAgent(picked.agent, platform, registryService, ctx);
					} else if (picked && !picked.available) {
						vscode.window.showWarningMessage(
							`${picked.label} is not available for your platform (${platform})`,
						);
					}
				} catch (err) {
					vscode.window.showErrorMessage(
						`Failed to fetch registry: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			},
		);
	});
}

function isAvailable(agent: RegistryAgent, platform: string): boolean {
	const dist = agent.distribution;
	return !!(dist.npx || dist.binary?.[platform] || dist.uvx);
}

function getAgentDir(context: vscode.ExtensionContext, agentId: string, version: string): string {
	return path.join(context.globalStorageUri.fsPath, "agents", agentId, version);
}

function execFileAsync(cmd: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		execFile(cmd, args, { timeout: 120_000 }, (err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

async function extractArchive(archivePath: string, destDir: string, archiveUrl: string): Promise<void> {
	fs.mkdirSync(destDir, { recursive: true });

	if (archiveUrl.endsWith(".zip")) {
		if (process.platform === "win32") {
			const psCmd = `Expand-Archive -Force -LiteralPath '${archivePath}' -DestinationPath '${destDir}'`;
			await execFileAsync("powershell", ["-NoProfile", "-Command", psCmd]);
		} else {
			await execFileAsync("unzip", ["-o", archivePath, "-d", destDir]);
		}
	} else if (archiveUrl.endsWith(".tar.gz") || archiveUrl.endsWith(".tgz")) {
		await execFileAsync("tar", ["-xzf", archivePath, "-C", destDir]);
	} else if (archiveUrl.endsWith(".tar.bz2")) {
		await execFileAsync("tar", ["-xjf", archivePath, "-C", destDir]);
	} else {
		throw new Error(`Unsupported archive format: ${archiveUrl}`);
	}
	try { fs.unlinkSync(archivePath); } catch {}
}

function findBinary(baseDir: string, targetName: string): string | null {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(baseDir, { withFileTypes: true });
	} catch {
		return null;
	}
	for (const entry of entries) {
		const full = path.join(baseDir, entry.name);
		if (entry.isDirectory()) {
			const found = findBinary(full, targetName);
			if (found) return found;
		} else if (entry.name === targetName) {
			return full;
		}
	}
	return null;
}

async function downloadAndExtractBinary(
	agent: RegistryAgent,
	platform: string,
	context: vscode.ExtensionContext,
	progress: vscode.Progress<{ message?: string; increment?: number }>,
): Promise<string> {
	const bin = agent.distribution.binary?.[platform];
	if (!bin) {
		throw new Error(`No binary distribution for ${platform}`);
	}

	const agentDir = getAgentDir(context, agent.id, agent.version);
	const cmdName = bin.cmd.replace(/^\.\/?/, "").replace(/^\.\\?/, "");
	const binaryPath = path.join(agentDir, cmdName);

	// Already downloaded?
	if (fs.existsSync(binaryPath)) {
		return binaryPath;
	}

	const archiveUrl = bin.archive;
	const ext = archiveUrl.endsWith(".tar.gz") || archiveUrl.endsWith(".tgz") ? ".tar.gz"
		: archiveUrl.endsWith(".tar.bz2") ? ".tar.bz2"
		: ".zip";

	progress.report({ message: `Downloading ${agent.name} v${agent.version}...` });

	const response = await fetch(archiveUrl);
	if (!response.ok) {
		throw new Error(`Download failed: HTTP ${response.status}`);
	}

	const tmpFile = path.join(agentDir, `download${ext}`);
	const buffer = Buffer.from(await response.arrayBuffer());
	fs.writeFileSync(tmpFile, buffer);

	progress.report({ message: `Extracting ${agent.name}...` });

	await extractArchive(tmpFile, agentDir, archiveUrl);

	if (fs.existsSync(binaryPath)) {
		return binaryPath;
	}

	const baseName = path.basename(cmdName);
	const found = findBinary(agentDir, baseName);
	if (found) {
		return found;
	}

	throw new Error(`Binary "${cmdName}" not found after extracting ${agent.name}`);
}

async function installAgent(
	agent: RegistryAgent,
	platform: string,
	registryService: RegistryService,
	ctx: CommandContext,
): Promise<void> {
	const cmdInfo = registryService.getAgentCommand(agent, platform);
	if (!cmdInfo) {
		vscode.window.showErrorMessage(`No installation method available for ${agent.name}`);
		return;
	}

	const confirm = await vscode.window.showInformationMessage(
		`Install ${agent.name} v${agent.version}?`,
		{ modal: true, detail: agent.description },
		"Install",
	);

	if (confirm !== "Install") {
		return;
	}

	let command = cmdInfo.command;
	let args = cmdInfo.args;
	const env = cmdInfo.env;

	if (agent.distribution.binary?.[platform]) {
		try {
			command = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Window,
					title: `Installing ${agent.name}...`,
					cancellable: false,
				},
				(progress) => downloadAndExtractBinary(agent, platform, ctx.context, progress),
			);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			vscode.window.showErrorMessage(`Failed to install ${agent.name}: ${errorMsg}`);
			return;
		}
	}

	const config = vscode.workspace.getConfiguration("vscodeAcp");
	const agents = (config.get<Array<{ id: string; name: string; command: string; args?: string[]; env?: Record<string, string> }>>("agents") || []);

	const exists = agents.some((a) => a.id === agent.id);
	if (exists) {
		const overwrite = await vscode.window.showWarningMessage(
			`${agent.name} is already configured. Overwrite?`,
			"Yes",
			"No",
		);
		if (overwrite !== "Yes") {
			return;
		}
	}

	const newAgent = {
		id: agent.id,
		name: agent.name,
		command,
		args,
		...(env && { env }),
	};

	const newAgents = exists
		? agents.map((a) => (a.id === agent.id ? newAgent : a))
		: [...agents, newAgent];

	await config.update("agents", newAgents, vscode.ConfigurationTarget.Global);

	const connection = ctx.registry.get(agent.id);
	if (!connection) {
		vscode.window.showInformationMessage(`${agent.name} added. Click the agent button to connect.`);
		return;
	}

	try {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Window,
				title: `Connecting to ${agent.name}...`,
				cancellable: false,
			},
			async () => {
				await connection.connect();
			},
		);

		ctx.state.setConnectionError(null);
		ctx.state.setActiveAgent(agent.id);

		const workspaceFolders = vscode.workspace.workspaceFolders;
		const cwd = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
		const session = await connection.createSession(cwd);

		ctx.state.addSession({
			id: session.id,
			agentId: agent.id,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			messageCount: 0,
		});
		ctx.state.setActiveSession(session.id);
		if (session.configOptions) {
			ctx.state.setConfigOptions(session.configOptions);
		}

		await vscode.commands.executeCommand("workbench.view.extension.vscodeAcp");

		vscode.window.showInformationMessage(`${agent.name} connected and ready!`);
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		ctx.state.setConnectionError(errorMsg);
		vscode.window.showErrorMessage(
			`Failed to connect to ${agent.name}: ${errorMsg}`,
		);
	}
}
