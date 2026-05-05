import * as vscode from "vscode";
import { Logger } from "../Logger.js";
import type { CommandContext } from "./index.js";

export function registerSelectAgent(ctx: CommandContext): vscode.Disposable {
	return vscode.commands.registerCommand("vscodeAcp.selectAgent", async () => {
		const agents = ctx.registry.getAll();

		if (agents.length === 0) {
			vscode.window.showWarningMessage(vscode.l10n.t("No agents configured. Add agents in settings."));
			return;
		}

		const items = agents.map((conn) => ({
			label: conn.config.name,
			description: conn.config.id,
			detail: conn.isConnected ? `$(check) ${vscode.l10n.t("Connected")}` : `$(circle-slash) ${vscode.l10n.t("Disconnected")}`,
			agentId: conn.config.id,
		}));

		const picked = await vscode.window.showQuickPick(items, {
			placeHolder: vscode.l10n.t("Select an agent"),
			title: vscode.l10n.t("ACP: Select Agent"),
		});

		if (picked) {
			const connection = ctx.registry.get(picked.agentId);
			if (!connection) {
				return;
			}

			if (!connection.isConnected) {
				try {
					await vscode.window.withProgress(
						{
							location: vscode.ProgressLocation.Window,
							title: vscode.l10n.t("Connecting to {0}...", picked.label),
							cancellable: false,
						},
						async () => {
							await connection.connect();
						},
					);
					ctx.state.setConnectionError(null);
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : String(err);
					ctx.state.setConnectionError(errorMsg);
					ctx.state.setActiveAgent(null);
					ctx.state.setActiveSession(null);
					ctx.state.setConfigOptions([]);
					vscode.window.showErrorMessage(
						vscode.l10n.t("Failed to connect: {0}", errorMsg),
					);
					return;
				}
			}

			ctx.state.batch(() => {
				ctx.state.setActiveAgent(picked.agentId);
			});

			const workspaceFolders = vscode.workspace.workspaceFolders;
			const cwd = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

			if (connection.supportsLoadSession) {
				try {
					let agentSessions = await connection.listSessions(cwd);
					if (agentSessions.length === 0) {
						agentSessions = await connection.listSessions();
					}
					ctx.state.setSessionsFromAgent(picked.agentId, agentSessions);
				} catch {
					ctx.state.setSessionsFromAgent(picked.agentId, []);
				}
			} else {
				for (const saved of ctx.state.state.sessions) {
					if (saved.agentId !== picked.agentId) continue;
					if (connection.getSession(saved.id)) continue;
					try {
						await connection.resumeSession(saved.id, cwd);
					} catch { /* skip */ }
				}
			}

			let existingSession: unknown;
			if (connection.supportsLoadSession) {
				existingSession = ctx.state.activeSession
					? ctx.state.state.sessions.find((s) => s.id === ctx.state.activeSession)
					: undefined;
			} else {
				existingSession = ctx.state.activeSession
					? connection.getSession(ctx.state.activeSession)
					: undefined;
			}
			if (existingSession) {
				if (connection.supportsLoadSession) {
					try {
						await ctx.sidebarProvider.loadSessionHistory(ctx.state.activeSession!);
					} catch { /* skip */ }
				}
			} else {
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
							agentId: picked.agentId,
							createdAt: Date.now(),
							updatedAt: Date.now(),
							messageCount: 0,
						});
					});
					ctx.sidebarProvider.updateCachedFromSession(picked.agentId, s.configOptions ?? [], s.models, s.modes);
				} catch (err) {
					Logger.getInstance().error("createSession FAILED on select: " + err);
				}
			}

			await vscode.commands.executeCommand("workbench.view.extension.vscodeAcp");
		}
	});
}
