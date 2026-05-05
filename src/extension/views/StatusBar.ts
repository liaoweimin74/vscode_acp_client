import * as vscode from "vscode";
import type { StateManager } from "../StateManager.js";
import type { AgentRegistry } from "../../protocol/AgentRegistry.js";

export class StatusBar {
	private readonly item: vscode.StatusBarItem;

	constructor(
		private readonly state: StateManager,
		private readonly registry: AgentRegistry,
	) {
		this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		this.item.command = "vscodeAcp.selectAgent";

		state.onDidChange(() => this.update());
		registry.on("agentAdded", () => this.update());
		registry.on("agentRemoved", () => this.update());
		registry.on("agentUpdated", () => this.update());

		this.update();
		this.item.show();
	}

	private update(): void {
		const { activeAgent, activeSession } = this.state;

		if (activeAgent) {
			const connection = this.registry.get(activeAgent);
			const name = connection?.config.name ?? activeAgent;
			const status = connection?.isConnected ? "$(check)" : "$(circle-slash)";

			let text = `${status} ${name}`;

			if (activeSession) {
				text += ` · ${activeSession.slice(0, 8)}`;
			}

			this.item.text = text;
			this.item.tooltip = `ACP: ${name}${activeSession ? ` — Session ${activeSession.slice(0, 8)}` : ""}`;
		} else {
			this.item.text = "$(robot) No Agent";
			this.item.tooltip = "ACP: No agent selected";
		}
	}

	dispose(): void {
		this.item.dispose();
	}
}
