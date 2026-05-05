import * as vscode from "vscode";
import type { CommandContext } from "./index.js";

export function registerSwitchSession(ctx: CommandContext): vscode.Disposable {
	return vscode.commands.registerCommand("vscodeAcp.switchSession", async () => {
		const sessions = ctx.state.state.sessions;

		if (sessions.length === 0) {
			vscode.window.showInformationMessage(vscode.l10n.t("No sessions available. Create one first."));
			return;
		}

		const items = sessions.map((s) => ({
			label: s.title,
			description: s.agentId,
			detail: `${s.messageCount} messages · ${new Date(s.updatedAt).toLocaleString()}`,
			sessionId: s.id,
		}));

		const picked = await vscode.window.showQuickPick(items, {
			placeHolder: vscode.l10n.t("Switch to session"),
			title: vscode.l10n.t("ACP: Switch Session"),
		});

		if (picked) {
			ctx.state.setActiveSession(picked.sessionId);
		}
	});
}
