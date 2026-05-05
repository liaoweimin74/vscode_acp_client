import * as vscode from "vscode";
import type { CommandContext } from "./index.js";
import { flattenSelectOptions } from "../../shared/utils.js";

export function registerSetThoughtLevel(ctx: CommandContext): vscode.Disposable {
	return vscode.commands.registerCommand("vscodeAcp.setThoughtLevel", async () => {
		const sessionId = ctx.state.activeSession;
		const agentId = ctx.state.activeAgent;
		if (!sessionId || !agentId) {
			vscode.window.showWarningMessage(vscode.l10n.t("No active session. Create or switch to a session first."));
			return;
		}

		const connection = ctx.registry.get(agentId);
		if (!connection || !connection.isConnected) {
			vscode.window.showErrorMessage(vscode.l10n.t("Agent is not connected."));
			return;
		}

		const session = connection.getSession(sessionId);
		if (!session) {
			vscode.window.showErrorMessage(vscode.l10n.t("Session not found."));
			return;
		}

		const thoughtOption = session.configOptions.find((opt) => opt.id === "thought_level");
		if (!thoughtOption || thoughtOption.type !== "select") {
			vscode.window.showInformationMessage(vscode.l10n.t("Thought level selection not available for this agent."));
			return;
		}

		const flatOptions = flattenSelectOptions(thoughtOption.options);
		const items = flatOptions.map((v) => ({
			label: v.name,
			description: v.value === thoughtOption.currentValue ? `$(check) ${vscode.l10n.t("Current")}` : "",
			valueId: v.value,
		}));

		const picked = await vscode.window.showQuickPick(items, {
			placeHolder: vscode.l10n.t("Select thought level"),
			title: vscode.l10n.t("ACP: Set Thought Level"),
		});

		if (picked) {
			try {
				await connection.setConfigOption(sessionId, "thought_level", picked.valueId);
				vscode.window.showInformationMessage(vscode.l10n.t("Thought level set to {0}", picked.label));
			} catch (err) {
				vscode.window.showErrorMessage(
					vscode.l10n.t("Failed to set thought level: {0}", err instanceof Error ? err.message : String(err)),
				);
			}
		}
	});
}
