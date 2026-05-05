import * as vscode from "vscode";
import type { CommandContext } from "./index.js";

export function registerSelectAgentRole(ctx: CommandContext): vscode.Disposable {
	return vscode.commands.registerCommand("vscodeAcp.selectAgentRole", async () => {
		const sessionId = ctx.state.activeSession;
		const agentId = ctx.state.activeAgent;
		if (!sessionId || !agentId) return;

		const connection = ctx.registry.get(agentId);
		if (!connection?.isConnected) return;

		const session = connection.getSession(sessionId);
		if (!session?.modes?.availableModes?.length) return;

		const modes = session.modes.availableModes;
		const currentModeId = session.modes.currentModeId;
		const currentIndex = modes.findIndex((m) => m.id === currentModeId);
		const nextIndex = (currentIndex + 1) % modes.length;
		const nextMode = modes[nextIndex];
		if (!nextMode) return;

		try {
			await connection.setSessionMode(sessionId, nextMode.id);
		} catch (err) {
			vscode.window.showErrorMessage(
				vscode.l10n.t("Failed to switch role: {0}", err instanceof Error ? err.message : String(err)),
			);
		}
	});
}
