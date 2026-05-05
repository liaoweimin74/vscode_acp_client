import * as vscode from "vscode";
import { registerSelectAgent } from "./selectAgent.js";
import { registerConnectAgent } from "./connectAgent.js";
import { registerNewSession } from "./newSession.js";
import { registerSwitchSession } from "./switchSession.js";
import { registerSelectModel } from "./selectModel.js";
import { registerSetThoughtLevel } from "./setThoughtLevel.js";
import { registerDiscoverAgents } from "./discoverAgents.js";
import { registerDisconnectAgent } from "./disconnectAgent.js";
import { registerSelectAgentRole } from "./selectAgentRole.js";
import type { AgentRegistry } from "../../protocol/AgentRegistry.js";
import type { StateManager } from "../StateManager.js";
import type { ConfigurationManager } from "../ConfigurationManager.js";
import type { WebviewBridge } from "../WebviewBridge.js";

import type { SidebarProvider } from "../views/SidebarProvider.js";

export interface CommandContext {
	registry: AgentRegistry;
	state: StateManager;
	bridge: WebviewBridge;
	context: vscode.ExtensionContext;
	sidebarProvider: SidebarProvider;
	configManager: ConfigurationManager;
}

export function registerCommands(context: vscode.ExtensionContext, cmdCtx: CommandContext): void {
	context.subscriptions.push(
		registerSelectAgent(cmdCtx),
		registerConnectAgent(cmdCtx),
		registerNewSession(cmdCtx),
		registerSwitchSession(cmdCtx),
		registerSelectModel(cmdCtx),
		registerSetThoughtLevel(cmdCtx),
		registerDiscoverAgents(cmdCtx),
		registerDisconnectAgent(cmdCtx),
		registerSelectAgentRole(cmdCtx),
		vscode.commands.registerCommand("vscodeAcp.openSettings", () => {
			vscode.commands.executeCommand("workbench.action.openSettings", "vscodeAcp");
		}),
	);
}
