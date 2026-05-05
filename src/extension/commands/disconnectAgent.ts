import * as vscode from "vscode";
import { Logger } from "../Logger.js";
import type { CommandContext } from "./index.js";

export function registerDisconnectAgent(ctx: CommandContext): vscode.Disposable {
	return vscode.commands.registerCommand("vscodeAcp.disconnectAgent", async () => {
		const agentId = ctx.state.activeAgent;
		if (!agentId) {
			return;
		}

		const connection = ctx.registry.get(agentId);
		if (connection) {
			const emptySessions = ctx.state.getEmptySessionIds();
			for (const sid of emptySessions) {
				try {
					await connection.closeSession(sid);
				} catch (err) {
					Logger.getInstance().error("closeSession failed for unpersisted session " + sid + ": " + err);
				}
			}
			await connection.disconnect();
		}

		ctx.state.setActiveAgent(null);
		ctx.state.setActiveSession(null);
		ctx.state.setConfigOptions([]);
		ctx.state.setConnectionError(null);
		ctx.state.clearAgentSessions();
	});
}
