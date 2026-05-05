import * as vscode from "vscode";
import type { CommandContext } from "./index.js";
import { flattenSelectOptions, isGroupedOptions, findGroupByValue, getDefaultLevel } from "../../shared/utils.js";

export function registerSelectModel(ctx: CommandContext): vscode.Disposable {
	return vscode.commands.registerCommand("vscodeAcp.selectModel", async () => {
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

		const modelOption = session.configOptions.find((opt) => opt.id === "model");
		if (!modelOption || modelOption.type !== "select") {
			vscode.window.showInformationMessage(vscode.l10n.t("Model selection not available for this agent."));
			return;
		}

		if (isGroupedOptions(modelOption.options)) {
			const currentGroup = findGroupByValue(modelOption.options, modelOption.currentValue);
			const groupItems = modelOption.options.map((g) => ({
				label: g.name,
				description: g.group === currentGroup?.group ? `$(check) ${vscode.l10n.t("Current")}` : "",
				groupId: g.group,
			}));

			const pickedGroup = await vscode.window.showQuickPick(groupItems, {
				placeHolder: vscode.l10n.t("Select a model family"),
				title: vscode.l10n.t("ACP: Select Model"),
			});
			if (!pickedGroup) return;

			const group = modelOption.options.find((g) => g.group === pickedGroup.groupId);
			if (!group) return;

			const levelOptions = group.options;
			const levelItems = levelOptions.map((v) => ({
				label: v.name,
				description: v.value === modelOption.currentValue ? `$(check) ${vscode.l10n.t("Current")}` : "",
				valueId: v.value,
			}));

			if (levelItems.length === 1) {
				await connection.setConfigOption(sessionId, "model", levelItems[0].valueId);
				return;
			}

			const pickedLevel = await vscode.window.showQuickPick(levelItems, {
				placeHolder: vscode.l10n.t("Select level for {0}", group.name),
				title: `ACP: ${group.name}`,
			});

			if (pickedLevel) {
				try {
					await connection.setConfigOption(sessionId, "model", pickedLevel.valueId);
					vscode.window.showInformationMessage(vscode.l10n.t("Model set to {0}", pickedLevel.label));
				} catch (err) {
					vscode.window.showErrorMessage(
						vscode.l10n.t("Failed to set model: {0}", err instanceof Error ? err.message : String(err)),
					);
				}
			}
		} else {
			const flatOptions = flattenSelectOptions(modelOption.options);
			const items = flatOptions.map((v) => ({
				label: v.name,
				description: v.value === modelOption.currentValue ? `$(check) ${vscode.l10n.t("Current")}` : "",
				valueId: v.value,
			}));

			const picked = await vscode.window.showQuickPick(items, {
				placeHolder: vscode.l10n.t("Select a model"),
				title: vscode.l10n.t("ACP: Select Model"),
			});

			if (picked) {
				try {
					await connection.setConfigOption(sessionId, "model", picked.valueId);
					vscode.window.showInformationMessage(vscode.l10n.t("Model set to {0}", picked.label));
				} catch (err) {
					vscode.window.showErrorMessage(
						vscode.l10n.t("Failed to set model: {0}", err instanceof Error ? err.message : String(err)),
					);
				}
			}
		}
	});
}
