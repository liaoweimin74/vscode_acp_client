import * as vscode from "vscode";
import { Logger } from "../Logger.js";
import type { CommandContext } from "./index.js";

export function registerNewSession(ctx: CommandContext): vscode.Disposable {
	return vscode.commands.registerCommand("vscodeAcp.newSession", async () => {
		const agentId = ctx.state.activeAgent;
		if (!agentId) {
			vscode.window.showWarningMessage(vscode.l10n.t("No agent selected. Select an agent first."));
			return;
		}

		const connection = ctx.registry.get(agentId);
		if (!connection || !connection.isConnected) {
			vscode.window.showErrorMessage(vscode.l10n.t("Agent is not connected. Reconnect and try again."));
			return;
		}

		const currentSession = ctx.state.activeSession;
		if (currentSession && !ctx.state.isSessionPrompted(currentSession)) {
			try {
				await connection.closeSession(currentSession);
				ctx.state.removeSession(currentSession);
			} catch (err) {
				Logger.getInstance().error("closeSession failed for empty session " + currentSession + ": " + err);
			}
		}

		ctx.state.batch(() => {
			ctx.state.setActiveSession(null);
		});
		ctx.sidebarProvider.clearWebviewMessages();

		const workspaceFolders = vscode.workspace.workspaceFolders;
		const cwd = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

		try {
			const s = await connection.createSession(cwd);
			ctx.state.batch(() => {
				ctx.state.setActiveSession(s.id);
				const configOpts = s.configOptions ?? [];
				const hasModelOpt = configOpts.some((o) => o.category === "model");
				if (s.models?.availableModels?.length && !hasModelOpt) {
					configOpts.push({
						id: "model",
						type: "select",
						category: "model",
						name: "Model",
						options: s.models.availableModels.map((m) => ({ name: m.name, value: m.modelId })),
						currentValue: s.models.currentModelId ?? s.models.availableModels[0]?.modelId ?? "",
					});
				}
				ctx.state.setConfigOptions(configOpts);
				if (s.modes?.availableModes?.length) {
					const seen = new Set<string>();
					const roles = s.modes.availableModes
						.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
						.map((m) => ({ id: m.id, name: m.name, description: m.description ?? undefined }));
					ctx.state.update({ agentRoles: roles, activeRole: s.modes.currentModeId ?? null });
				}
				ctx.state.addSession({
					id: s.id,
					agentId,
					createdAt: Date.now(),
					updatedAt: Date.now(),
					messageCount: 0,
				});
			});
			ctx.sidebarProvider.updateCachedFromSession(agentId, s.configOptions ?? [], s.models, s.modes);
		} catch (err) {
			Logger.getInstance().error("createSession FAILED: " + err);
		}
	});
}
