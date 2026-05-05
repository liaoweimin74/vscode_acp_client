import * as vscode from "vscode";
import type { AgentConfig, CachedModel, CachedRole } from "../shared/types/acp.js";

const SECTION = "vscodeAcp";

export class ConfigurationManager implements vscode.Disposable {
	private readonly _onDidChangeAgents = new vscode.EventEmitter<AgentConfig[]>();
	readonly onDidChangeAgents = this._onDidChangeAgents.event;
	private readonly listener: vscode.Disposable;

	constructor() {
		this.listener = vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration(`${SECTION}.agents`)) {
				this._onDidChangeAgents.fire(this.getAgentConfigs());
			}
		});
	}

	getAgentConfigs(): AgentConfig[] {
		const raw = vscode.workspace.getConfiguration(SECTION).get<unknown[]>("agents", []);
		const configs: AgentConfig[] = [];
		for (const item of raw) {
			const cfg = item as AgentConfig;
			if (cfg.id && cfg.name && cfg.command) {
				configs.push(cfg);
			}
		}
		return configs;
	}

	getDefaultAgent(): string {
		return vscode.workspace.getConfiguration(SECTION).get<string>("defaultAgent", "");
	}

	getTheme(): string {
		return vscode.workspace.getConfiguration(SECTION).get<string>("theme", "auto");
	}

	getCachedModels(agentId: string): CachedModel[] {
		const configs = this.getAgentConfigs();
		return configs.find((c) => c.id === agentId)?.cachedModels ?? [];
	}

	getCachedRoles(agentId: string): CachedRole[] {
		const configs = this.getAgentConfigs();
		return configs.find((c) => c.id === agentId)?.cachedRoles ?? [];
	}

	async updateCachedModelsAndRoles(agentId: string, models?: CachedModel[], roles?: CachedRole[]): Promise<void> {
		const config = vscode.workspace.getConfiguration(SECTION);
		const raw = config.get<unknown[]>("agents", []);
		const index = raw.findIndex((item) => (item as AgentConfig).id === agentId);
		if (index === -1) return;
		const agents = [...raw] as AgentConfig[];
		const existing = agents[index];
		agents[index] = {
			...existing,
			...(models !== undefined ? { cachedModels: models } : {}),
			...(roles !== undefined ? { cachedRoles: roles } : {}),
		};
		await config.update("agents", agents, vscode.ConfigurationTarget.Global);
	}

	dispose(): void {
		this.listener.dispose();
		this._onDidChangeAgents.dispose();
	}
}
