import * as vscode from "vscode";
import type { AgentConfig } from "../shared/types/acp.js";

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

	dispose(): void {
		this.listener.dispose();
		this._onDidChangeAgents.dispose();
	}
}
