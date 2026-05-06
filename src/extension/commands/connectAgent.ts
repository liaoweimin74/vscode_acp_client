import * as vscode from "vscode";
import { Logger } from "../Logger.js";
import type { CommandContext } from "./index.js";

async function restoreSessions(ctx: CommandContext, agentId: string, cwd: string) {
	const connection = ctx.registry.get(agentId);
	if (!connection?.isConnected) return;

	if (connection.supportsLoadSession) {
		try {
			let agentSessions = await connection.listSessions(cwd);
			if (agentSessions.length === 0) {
				agentSessions = await connection.listSessions();
			}
			ctx.state.setSessionsFromAgent(agentId, agentSessions);
		} catch (err) {
			Logger.getInstance().error("listSessions FAILED: " + err);
			ctx.state.setSessionsFromAgent(agentId, []);
		}
		return;
	}

	for (const saved of ctx.state.state.sessions) {
		if (saved.agentId !== agentId) continue;
		if (connection.getSession(saved.id)) continue;
		try {
			await connection.resumeSession(saved.id, cwd);
		} catch {
		}
	}
}

export function registerConnectAgent(ctx: CommandContext): vscode.Disposable {
	return vscode.commands.registerCommand("vscodeAcp.connectAgent", async (agentId: string) => {
		const connection = ctx.registry.get(agentId);
		if (!connection) {
			vscode.window.showWarningMessage(vscode.l10n.t('Agent "{0}" not found.', agentId));
			return;
		}

		if (!connection.isConnected) {
			try {
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Window,
						title: vscode.l10n.t("Connecting to {0}...", connection.config.name),
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
				vscode.window.showErrorMessage(vscode.l10n.t("Failed to connect: {0}", errorMsg));
				return;
			}
		}

		ctx.state.batch(() => {
			ctx.state.setActiveAgent(agentId);
		});

		const workspaceFolders = vscode.workspace.workspaceFolders;
		const cwd = workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

		await restoreSessions(ctx, agentId, cwd);

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
				} catch (err) {
					Logger.getInstance().error("loadSession FAILED for " + ctx.state.activeSession + ": " + err);
				}
			}
			const session = connection.getSession(ctx.state.activeSession!);
			if (session) {
				ctx.state.batch(() => {
					const configOpts = session.configOptions ? [...session.configOptions] : [];
					const hasModelOpt = configOpts.some((o) => o.category === "model");
					if (session.models?.availableModels?.length && !hasModelOpt) {
						configOpts.push({
							id: "model",
							type: "select",
							category: "model",
							name: "Model",
							options: session.models.availableModels.map((m) => ({ name: m.name, value: m.modelId })),
							currentValue: session.models.currentModelId ?? session.models.availableModels[0]?.modelId ?? "",
						});
					}
					ctx.state.setConfigOptions(configOpts);
					if (session.modes?.availableModes?.length) {
						const seen = new Set<string>();
						const roles = session.modes.availableModes
							.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
							.map((m) => ({ id: m.id, name: m.name, description: m.description ?? undefined }));
						ctx.state.update({ agentRoles: roles, activeRole: session.modes.currentModeId ?? null });
					}
				});
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
						agentId,
						createdAt: Date.now(),
						updatedAt: Date.now(),
						messageCount: 0,
					});
				});
			} catch (err) {
				Logger.getInstance().error("createSession FAILED on connect: " + err);
			}
		}

		await vscode.commands.executeCommand("workbench.view.extension.vscodeAcp");
	});
}
