import * as vscode from "vscode";
import { AgentConnection } from "../protocol/AgentConnection.js";
import { AgentRegistry } from "../protocol/AgentRegistry.js";
import { StateManager } from "./StateManager.js";
import { ConfigurationManager } from "./ConfigurationManager.js";
import { WebviewBridge } from "./WebviewBridge.js";
import { SidebarProvider } from "./views/SidebarProvider.js";
import { StatusBar } from "./views/StatusBar.js";
import { registerCommands } from "./commands/index.js";
import { Logger } from "./Logger.js";
import { SlashCommandRegistry } from "./SlashCommandRegistry.js";

let registry: AgentRegistry;
let stateManager: StateManager;
let configManager: ConfigurationManager;
let bridge: WebviewBridge;
let slashRegistry: SlashCommandRegistry;

export function activate(context: vscode.ExtensionContext) {
	const logLevel = vscode.workspace.getConfiguration("vscodeAcp").get<string>("logLevel", "info");
	const logger = Logger.init(vscode.window.createOutputChannel("ACP Agent"));
	logger.setLevel(logLevel as "debug" | "info" | "warn" | "error");

	registry = new AgentRegistry();
	stateManager = new StateManager(context.globalState);
	configManager = new ConfigurationManager();
	bridge = new WebviewBridge(context.extensionUri);
	slashRegistry = new SlashCommandRegistry();

	slashRegistry.register({
		name: "model",
		description: vscode.l10n.t("Switch model"),
		execute: async (args) => {
			const sessionId = stateManager.activeSession;
			const agentId = stateManager.activeAgent;
			if (!sessionId || !agentId) return;
			const connection = registry.get(agentId);
			if (!connection?.isConnected) return;
			await connection.setConfigOption(sessionId, "model", args);
		},
	});

	slashRegistry.register({
		name: "sessions",
		description: vscode.l10n.t("Switch session"),
		builtin: true,
		execute: async () => {
			bridge.postMessage({
				type: "open_command_popup",
				popup: "sessions",
			});
		},
	});

	slashRegistry.register({
		name: "models",
		description: vscode.l10n.t("Switch model"),
		builtin: true,
		execute: async () => {
			bridge.postMessage({
				type: "open_command_popup",
				popup: "models",
			});
		},
	});

	slashRegistry.register({
		name: "think",
		description: vscode.l10n.t("Set thought level"),
		execute: async (args) => {
			const sessionId = stateManager.activeSession;
			const agentId = stateManager.activeAgent;
			if (!sessionId || !agentId) return;
			const connection = registry.get(agentId);
			if (!connection?.isConnected) return;
			await connection.setConfigOption(sessionId, "thought_level", args);
		},
	});

	slashRegistry.register({
		name: "agent",
		description: vscode.l10n.t("Switch agent"),
		execute: async (args) => {
			vscode.commands.executeCommand("vscodeAcp.selectAgent");
		},
	});

	slashRegistry.register({
		name: "clear",
		description: vscode.l10n.t("Clear conversation"),
		execute: async () => {
			bridge.postMessage({
				type: "session_update",
				sessionId: stateManager.activeSession ?? "",
				update: { sessionUpdate: "clear_conversation" } as unknown as import("../shared/types/acp.js").SessionUpdate,
			});
		},
	});

	const agentConfigs = configManager.getAgentConfigs();
	for (const cfg of agentConfigs) {
		registry.add(new AgentConnection(cfg));
	}

	const defaultAgent = configManager.getDefaultAgent();
	if (defaultAgent && registry.has(defaultAgent)) {
		const conn = registry.get(defaultAgent);
		if (conn?.isConnected) {
			stateManager.setActiveAgent(defaultAgent);
		}
	}

	configManager.onDidChangeAgents((configs) => {
		const existingIds = new Set(registry.getAll().map((c) => c.config.id));
		const newIds = new Set(configs.map((c) => c.id));

		for (const id of existingIds) {
			if (!newIds.has(id)) {
				registry.remove(id);
			}
		}

		for (const cfg of configs) {
			if (!existingIds.has(cfg.id)) {
				registry.add(new AgentConnection(cfg));
			}
		}
	});

	const sidebarProvider = new SidebarProvider(context.extensionUri, bridge, stateManager, registry, slashRegistry, context.globalStorageUri, configManager);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider, {
			webviewOptions: { retainContextWhenHidden: true },
		}),
	);

	const statusBar = new StatusBar(stateManager, registry);

	registry.on("sessionUpdate", (event) => {
		const update = event.update as Record<string, unknown>;
		if (update?.sessionUpdate === "session_info_update" && update.title) {
			stateManager.updateSessionTitle(event.sessionId, update.title as string);
		}
	});

	registry.on("configChanged", (event) => {
		stateManager.setConfigOptions(event.options as import("../shared/types/acp.js").SessionConfigOption[]);
		bridge.postMessage({
			type: "session_update",
			sessionId: event.sessionId,
			update: { sessionUpdate: "config_option_update", configOptions: event.options } as import("../shared/types/acp.js").SessionUpdate,
		});
	});

	registerCommands(context, { registry, state: stateManager, bridge, context, sidebarProvider, configManager });

	context.subscriptions.push(stateManager, configManager, bridge, statusBar);
}

export function deactivate() {
	registry?.disconnectAll();
	Logger.getInstance().dispose();
}
