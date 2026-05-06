import * as vscode from "vscode";
import type { CommandContext } from "./index.js";
import type { RegistryAgent } from "../../shared/types/registry.js";
import { RegistryService } from "../RegistryService.js";

export function registerDiscoverAgents(ctx: CommandContext): vscode.Disposable {
	const registryService = new RegistryService();

	return vscode.commands.registerCommand("vscodeAcp.discoverAgents", async () => {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Window,
				title: vscode.l10n.t("Fetching agent registry..."),
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
								: vscode.l10n.t("$(circle-slash) Not available for {0}", platform),
							agent,
							available,
						};
					});

					const picked = await vscode.window.showQuickPick(items, {
						placeHolder: vscode.l10n.t("Select an agent to add"),
						title: vscode.l10n.t("ACP: Discover Agents"),
						matchOnDescription: true,
						matchOnDetail: true,
					});

					if (picked && picked.available) {
						await registerAgent(picked.agent, platform, registryService, ctx);
					} else if (picked && !picked.available) {
						vscode.window.showWarningMessage(
							vscode.l10n.t("{0} is not available for your platform ({1})", picked.label, platform),
						);
					}
				} catch (err) {
					vscode.window.showErrorMessage(
						vscode.l10n.t("Failed to fetch registry: {0}", err instanceof Error ? err.message : String(err)),
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

async function registerAgent(
	agent: RegistryAgent,
	platform: string,
	registryService: RegistryService,
	ctx: CommandContext,
): Promise<void> {
	const cmdInfo = registryService.getAgentCommand(agent, platform);
	if (!cmdInfo) {
		vscode.window.showErrorMessage(vscode.l10n.t("No configuration available for {0}", agent.name));
		return;
	}

	const confirm = await vscode.window.showInformationMessage(
		vscode.l10n.t("Add {0} to agent configuration?", agent.name),
		{ modal: true, detail: agent.description },
		vscode.l10n.t("Add"),
	);

	if (confirm !== vscode.l10n.t("Add")) {
		return;
	}

	const config = vscode.workspace.getConfiguration("vscodeAcp");
	const agents = (config.get<Array<{ id: string; name: string; command: string; args?: string[]; env?: Record<string, string> }>>("agents") || []);

	const exists = agents.some((a) => a.id === agent.id);
	if (exists) {
		const overwrite = await vscode.window.showWarningMessage(
			vscode.l10n.t("{0} is already configured. Overwrite?", agent.name),
			vscode.l10n.t("Yes"),
			vscode.l10n.t("No"),
		);
		if (overwrite !== vscode.l10n.t("Yes")) {
			return;
		}
	}

	const newAgent = {
		id: agent.id,
		name: agent.name,
		command: cmdInfo.command,
		args: cmdInfo.args,
		...(cmdInfo.env && { env: cmdInfo.env }),
	};

	const newAgents = exists
		? agents.map((a) => (a.id === agent.id ? newAgent : a))
		: [...agents, newAgent];

	await config.update("agents", newAgents, vscode.ConfigurationTarget.Global);

	const connection = ctx.registry.get(agent.id);
	if (!connection) {
		vscode.window.showInformationMessage(vscode.l10n.t("{0} added. Click the agent button to connect.", agent.name));
		return;
	}

	try {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Window,
				title: vscode.l10n.t("Connecting to {0}...", agent.name),
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

		vscode.window.showInformationMessage(vscode.l10n.t("{0} connected and ready!", agent.name));
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		ctx.state.setConnectionError(errorMsg);
		vscode.window.showErrorMessage(
			vscode.l10n.t("Failed to connect to {0}: {1}", agent.name, errorMsg),
		);
	}
}
