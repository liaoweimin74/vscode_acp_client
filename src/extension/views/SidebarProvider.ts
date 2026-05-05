import * as vscode from "vscode";
import type { AgentRegistry } from "../../protocol/AgentRegistry.js";
import type { ExtensionMessage, ExtensionState } from "../../shared/types/extension.js";
import type { CachedModel, CachedRole, SessionConfigOption } from "../../shared/types/acp.js";
import { Logger } from "../Logger.js";
import type { SlashCommandRegistry } from "../SlashCommandRegistry.js";
import type { StateManager } from "../StateManager.js";
import type { ConfigurationManager } from "../ConfigurationManager.js";
import type { WebviewBridge } from "../WebviewBridge.js";

export class SidebarProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "vscodeAcp.sidebar";
	private resolved = false;
	private sessionMessages = new Map<string, import("../../shared/types/extension.js").Message[]>();
	private sessionUpdates = new Map<string, Record<string, unknown>[]>();
	private _promptStartTimes = new Map<string, number>();
	private _cancelledSessions = new Set<string>();
	private _cancelledMessageIds = new Set<string>();
	private _promptGeneration = 0;
	private _acceptedGeneration = 0;

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly bridge: WebviewBridge,
		private readonly state: StateManager,
		private readonly registry: AgentRegistry,
		private readonly slashRegistry: SlashCommandRegistry,
		private readonly globalStorageUri: vscode.Uri,
		private readonly configManager: ConfigurationManager,
	) {
		const log = Logger.getInstance();
		this.state.onDidChange((state) => {
			if (!this.resolved) return;
			this.populateAgentRoles(state);
			const log = Logger.getInstance();
			log.info(`[STATE_UPDATE] activeAgent=${state.activeAgent}, activeSession=${state.activeSession}, configOptions=${state.configOptions?.length ?? 0}, agentRoles=${state.agentRoles?.length ?? 0}, activeRole=${state.activeRole}`);
			this.bridge.postMessage({ type: "state_update", state: { ...state, locale: vscode.env.language } });
		});

		this.registry.on("agentAdded", () => {
			this.pushState();
		});
		this.registry.on("agentRemoved", () => {
			this.pushState();
		});
		this.registry.on("agentUpdated", () => {
			this.pushState();
		});
		this.registry.on("stateChanged", () => {
			this.pushState();
			this.pushSlashCommands();
		});
		this.registry.on("reconnecting", (e) => {
			this.bridge.postMessage({ type: "agent_reconnecting", attempt: e.attempt });
		});
		this.registry.on("reconnectFailed", () => {
			this.bridge.postMessage({ type: "agent_reconnect_failed" });
		});
		this.registry.on("sessionUpdate", (event) => {
			const update = event.update as Record<string, unknown>;
			this.accumulateMessage(event.sessionId, update);
		});
	}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.resolved = true;
		this.bridge.resolveWebviewView(webviewView);

		this.bridge.onDidReceiveMessage((msg) => {
			this.handleWebviewMessage(msg);
		});

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				this.pushState();
				const sessionId = this.state.activeSession;
				if (sessionId) {
					const msgs = this.sessionMessages.get(sessionId);
					if (msgs) {
						this.bridge.postMessage({ type: "session_messages", sessionId, messages: msgs });
					}
				}
			}
		});

		this.pushState();
	}

	private pushState(): void {
		const agents = this.registry.getAll().map((conn) => ({
			config: conn.config,
			status: conn.isConnected ? ("connected" as const) : ("disconnected" as const),
		}));

		this.state.batch(() => {
			this.state.setAgents(agents);

			const sessions = this.state.state.sessions.map((s) => ({
				...s,
				messageCount: this.sessionMessages.get(s.id)?.length ?? s.messageCount,
			}));
			this.state.setSessions(sessions);

			const activeSession = this.state.activeSession;
			const activeAgent = this.state.activeAgent;
			if (activeSession && activeAgent) {
				const connection = this.registry.get(activeAgent);
				const session = connection?.getSession(activeSession);
				if (session?.configOptions?.length) {
					const configOpts = [...session.configOptions];
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
					this.state.setConfigOptions(configOpts);
				}
				const modes = session?.modes;
				if (modes?.availableModes?.length) {
					const seen = new Set<string>();
					const roles = modes.availableModes
						.filter((m) => {
							if (seen.has(m.id)) return false;
							seen.add(m.id);
							return true;
						})
						.map((m) => ({
							id: m.id,
							name: m.name,
							description: m.description ?? undefined,
						}));
					this.state.update({ agentRoles: roles, activeRole: modes.currentModeId ?? null });
				}
			} else {
				this.state.setConfigOptions([]);
				this.state.update({ agentRoles: [], activeRole: null });
			}
		});
	}

	clearWebviewMessages(): void {
		this.bridge.postMessage({ type: "session_messages", sessionId: "", messages: [] });
	}

	/** Populate agentRoles from the active session's modes directly into state (no re-fire) */
	private populateAgentRoles(state: ExtensionState): void {
		const activeSession = this.state.activeSession;
		const activeAgent = this.state.activeAgent;
		if (activeSession && activeAgent) {
			const connection = this.registry.get(activeAgent);
			const session = connection?.getSession(activeSession);
			const modes = session?.modes;
			if (modes?.availableModes?.length) {
				const seen = new Set<string>();
				const roles = modes.availableModes
					.filter((m) => {
						if (seen.has(m.id)) return false;
						seen.add(m.id);
						return true;
					})
					.map((m) => ({
						id: m.id,
						name: m.name,
						description: m.description ?? undefined,
					}));
				state.agentRoles = roles;
				state.activeRole = modes.currentModeId ?? null;
			}
		}
	}

	private pushSlashCommands(): void {
		const commands = this.slashRegistry.list().map((c) => ({
			name: `/${c.name}`,
			description: c.description,
		}));
		this.bridge.postMessage({
			type: "session_update",
			sessionId: this.state.activeSession ?? "",
			update: { sessionUpdate: "slash_commands", commands } as unknown as import("../../shared/types/acp.js").SessionUpdate,
		});
	}

	private async handleWebviewMessage(msg: { type: string; [key: string]: unknown }): Promise<void> {
		switch (msg.type) {
			case "select_agent": {
				const agentId = msg.agentId as string;
				if (agentId) {
					vscode.commands.executeCommand("vscodeAcp.connectAgent", agentId);
				}
				break;
			}
			case "new_session":
				vscode.commands.executeCommand("vscodeAcp.newSession");
				break;
			case "discover_agents":
				vscode.commands.executeCommand("vscodeAcp.discoverAgents");
				break;
			case "switch_session": {
				const sessionId = msg.sessionId as string;
				this.state.setActiveSession(sessionId);
				this.pushState();
				const msgs = this.sessionMessages.get(sessionId);
				if (msgs) {
					this.bridge.postMessage({ type: "session_messages", sessionId, messages: msgs });
				} else {
					this.loadSessionHistory(sessionId);
				}
				break;
			}
			case "send_prompt": {
				const sessionId = msg.sessionId as string;
				const prompt = msg.prompt as string;
				const attachments = msg.attachments as import("../../shared/types/extension.js").FileAttachment[] | undefined;
				if (sessionId) {
					this.sendPrompt(sessionId, prompt, attachments);
				}
				break;
			}
			case "cancel_prompt": {
				const cancelSessionId = msg.sessionId as string;
				this.cancelPrompt(cancelSessionId);
				break;
			}
			case "set_config": {
				const configSessionId = msg.sessionId as string;
				const configId = msg.configId as string;
				const value = msg.value as string;
				this.setConfig(configSessionId, configId, value);
				break;
			}
			case "disconnect_agent":
				vscode.commands.executeCommand("vscodeAcp.disconnectAgent");
				break;
			case "delete_session": {
				const deleteId = msg.sessionId as string;
				const delAgentId = this.state.activeAgent;
				const delConn = delAgentId ? this.registry.get(delAgentId) : undefined;
				if (delConn?.isConnected) {
					try {
						await delConn.closeSession(deleteId);
					} catch (err) {
						Logger.getInstance().error("closeSession failed: " + err);
					}
				}
				this.sessionMessages.delete(deleteId);
				this.sessionUpdates.delete(deleteId);
				const wasActive = this.state.activeSession === deleteId;
				this.state.removeSession(deleteId);
				if (wasActive && delAgentId && delConn?.isConnected) {
					vscode.commands.executeCommand("vscodeAcp.newSession");
				}
				break;
			}
			case "clear_empty_sessions": {
				const clearAgentId = this.state.activeAgent;
				const clearConn = clearAgentId ? this.registry.get(clearAgentId) : undefined;
				const removedIds = this.state.removeEmptySessions();
				for (const rid of removedIds) {
					this.sessionMessages.delete(rid);
					this.sessionUpdates.delete(rid);
					if (clearConn?.isConnected) {
						try {
							await clearConn.closeSession(rid);
						} catch (err) {
							Logger.getInstance().error("closeSession failed: " + err);
						}
					}
				}
				if (removedIds.includes(this.state.activeSession ?? "") && clearConn?.isConnected) {
					vscode.commands.executeCommand("vscodeAcp.newSession");
				}
				break;
			}
			case "slash_command": {
				const command = msg.command as string;
				const args = msg.args as string;
				const result = await this.slashRegistry.execute(command, args);
				if (!result.success || !result.builtin) {
					const sessionId = this.state.activeSession;
					if (sessionId) {
						const fullCommand = args ? `/${command} ${args}` : `/${command}`;
						this.sendPrompt(sessionId, fullCommand);
					}
				}
				break;
			}
			case "switch_role": {
				const roleId = msg.roleId as string;
				const sid = this.state.activeSession;
				const aid = this.state.activeAgent;
				if (sid && aid) {
					const connection = this.registry.get(aid);
					if (connection?.isConnected) {
						try {
							await connection.setSessionMode(sid, roleId);
							const session = connection.getSession(sid);
							if (session?.modes) {
								session.modes.currentModeId = roleId;
							}
							this.pushState();
						} catch (err) {
							Logger.getInstance().error(`switch_role FAILED: ${err}`);
						}
					}
				}
				break;
			}
			case "pick_files": {
				const canSelectFiles = msg.canSelectFiles as boolean;
				const canSelectFolders = msg.canSelectFolders as boolean;
				const uris = await vscode.window.showOpenDialog({
					canSelectFiles,
					canSelectFolders,
					canSelectMany: true,
					title: canSelectFolders && !canSelectFiles ? vscode.l10n.t("Select Folders") : vscode.l10n.t("Select Files"),
				});
				const files: import("../../shared/types/extension.js").FileAttachment[] = (uris ?? []).map((uri) => ({
					path: uri.fsPath,
					name: uri.fsPath.split(/[/\\]/).pop() ?? uri.fsPath,
					isDirectory: canSelectFolders && !canSelectFiles,
				}));
				this.bridge.postMessage({ type: "file_dialog_result", files });
				break;
			}
		}
	}

	async loadSessionHistory(sessionId: string): Promise<void> {
		const agentId = this.state.activeAgent;
		if (!agentId) return;

		const connection = this.registry.get(agentId);
		if (!connection?.isConnected) return;

		const session = connection.getSession(sessionId);
		const cwd = session?.cwd ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (!cwd) return;

		if (!session) {
			try {
				await connection.resumeSession(sessionId, cwd);
				const resumedSession = connection.getSession(sessionId);
				if (resumedSession) {
					this.updateCachedFromSession(agentId, resumedSession.configOptions ?? [], resumedSession.models, resumedSession.modes);
				}
			} catch {
				return;
			}
		}

		if (connection.supportsLoadSession) {
			try {
				this.sessionMessages.delete(sessionId);
				this.sessionUpdates.delete(sessionId);
				await connection.loadSession(sessionId, cwd);
				const loadedSession = connection.getSession(sessionId);
				if (loadedSession) {
					this.updateCachedFromSession(agentId, loadedSession.configOptions ?? [], loadedSession.models, loadedSession.modes);
				}
				const msgs = this.sessionMessages.get(sessionId) ?? [];
				this.bridge.postMessage({ type: "session_messages", sessionId, messages: msgs });
			} catch (err) {
				Logger.getInstance().error("loadSession FAILED: " + err);
			}
		} else {
			try {
				const messages = await this.readSessionFromFile(sessionId);
				this.bridge.postMessage({ type: "session_messages", sessionId, messages });
			} catch (err) {
				Logger.getInstance().error("readSessionFromFile FAILED: " + err);
			}
		}
	}

	private getSessionsFileUri(): vscode.Uri | null {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders?.length) return null;
		const workspacePath = workspaceFolders[0].uri.fsPath;
		const hash = Buffer.from(workspacePath).toString("hex").slice(0, 16);
		return vscode.Uri.joinPath(this.globalStorageUri, "sessions", hash, "sessions.json");
	}

	private async saveSessionToFile(sessionId: string): Promise<void> {
		const agentId = this.state.activeAgent;
		if (!agentId) return;

		const connection = this.registry.get(agentId);
		if (!connection?.isConnected || connection.supportsLoadSession) return;

		const updates = this.sessionUpdates.get(sessionId);
		if (!updates?.length) return;

		const sessionsFileUri = this.getSessionsFileUri();
		if (!sessionsFileUri) return;

		await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(sessionsFileUri, ".."));

		let sessions: Array<Record<string, unknown>> = [];
		try {
			const content = await vscode.workspace.fs.readFile(sessionsFileUri);
			const text = Buffer.from(content).toString("utf-8");
			sessions = JSON.parse(text);
			if (!Array.isArray(sessions)) sessions = [];
		} catch {
			sessions = [];
		}

		let sessionData = sessions.find((s) => s.id === sessionId);
		if (!sessionData) {
			const title = this.state.state.sessions.find((s) => s.id === sessionId)?.title ?? sessionId;
			sessionData = { id: sessionId, title, updates: [] };
			sessions.push(sessionData);
		}

		sessionData.updates = updates;

		await vscode.workspace.fs.writeFile(
			sessionsFileUri,
			Buffer.from(JSON.stringify(sessions, null, 2), "utf-8"),
		);
	}

	private async removeSessionFromFile(sessionId: string): Promise<void> {
		const agentId = this.state.activeAgent;
		if (!agentId) return;

		const connection = this.registry.get(agentId);
		if (!connection?.isConnected || connection.supportsLoadSession) return;

		const sessionsFileUri = this.getSessionsFileUri();
		if (!sessionsFileUri) return;

		let sessions: Array<Record<string, unknown>> = [];
		try {
			const content = await vscode.workspace.fs.readFile(sessionsFileUri);
			const text = Buffer.from(content).toString("utf-8");
			sessions = JSON.parse(text);
			if (!Array.isArray(sessions)) return;
		} catch {
			return;
		}

		const filtered = sessions.filter((s) => s.id !== sessionId);
		if (filtered.length === sessions.length) return;

		await vscode.workspace.fs.writeFile(
			sessionsFileUri,
			Buffer.from(JSON.stringify(filtered, null, 2), "utf-8"),
		);
	}

	private async readSessionFromFile(
		sessionId: string,
	): Promise<import("../../shared/types/extension.js").Message[]> {
		const sessionsFileUri = this.getSessionsFileUri();
		if (!sessionsFileUri) return [];

		let content: Uint8Array;
		try {
			content = await vscode.workspace.fs.readFile(sessionsFileUri);
		} catch {
			return [];
		}

		const text = Buffer.from(content).toString("utf-8");
		const data = JSON.parse(text);
		if (!Array.isArray(data)) return [];

		const sessionData = data.find((s: Record<string, unknown>) => s.id === sessionId);
		if (!sessionData) return [];

		const updates = sessionData.updates as Array<Record<string, unknown>> | undefined;
		if (!updates?.length) return [];

		this.sessionMessages.delete(sessionId);
		this.sessionUpdates.delete(sessionId);

		for (const update of updates) {
			this.accumulateMessage(sessionId, update, false);
		}

		this.sessionUpdates.set(sessionId, updates);

		return this.sessionMessages.get(sessionId) ?? [];
	}

	private accumulateMessage(
		sessionId: string,
		update: Record<string, unknown>,
		persist = true,
	): void {
		if (persist) {
			const updates = this.sessionUpdates.get(sessionId) ?? [];
			updates.push(update);
			this.sessionUpdates.set(sessionId, updates);
		}

		const sessionUpdate = update.sessionUpdate as string | undefined;
		if (sessionUpdate === "current_mode_update") {
			const agentId = this.state.activeAgent;
			if (!agentId) return;
			const connection = this.registry.get(agentId);
			const session = connection?.getSession(sessionId);
			if (session?.modes) {
				session.modes.currentModeId =
					(update.currentModeId as string) ?? session.modes.currentModeId;
			}
			return;
		}
		if (sessionUpdate === "agent_message_chunk" || sessionUpdate === "agent_thought_chunk") {
			if (this._acceptedGeneration < this._promptGeneration) {
				return;
			}
			const content = update.content as Record<string, unknown> | undefined;
			if (content?.type === "text" && typeof content.text === "string") {
				const messageId = (update as Record<string, unknown>).messageId as string | undefined;
				const isThought = sessionUpdate === "agent_thought_chunk";
				const existing = this.sessionMessages.get(sessionId) ?? [];
				const lastMsg = existing[existing.length - 1];
				if (messageId && lastMsg && lastMsg.id === messageId && lastMsg.role === "assistant") {
					if (!isThought) {
						lastMsg.content += content.text as string;
					}
					if (!lastMsg.chunks) lastMsg.chunks = [];
					lastMsg.chunks.push({
						type: isThought ? "thought" : "text",
						content: content.text as string,
						timestamp: Date.now(),
					});
				} else {
					const msg: import("../../shared/types/extension.js").Message = {
						id: messageId ?? `msg_${Date.now()}`,
						sessionId,
						role: "assistant",
						content: isThought ? "" : (content.text as string),
						timestamp: Date.now(),
						chunks: [
							{
								type: isThought ? "thought" : "text",
								content: content.text as string,
								timestamp: Date.now(),
							},
						],
					};
					this.sessionMessages.set(sessionId, [...existing, msg]);
				}
			}
		} else if (sessionUpdate === "user_message_chunk") {
			const content = update.content as Record<string, unknown> | undefined;
			if (content?.type === "text" && typeof content.text === "string") {
				const existing = this.sessionMessages.get(sessionId) ?? [];
				const lastMsg = existing[existing.length - 1];
				if (lastMsg && lastMsg.role === "user" && lastMsg.content === content.text) {
					return;
				}
				const msg: import("../../shared/types/extension.js").Message = {
					id: `user_${Date.now()}`,
					sessionId,
					role: "user",
					content: content.text as string,
					timestamp: Date.now(),
				};
				this.sessionMessages.set(sessionId, [...existing, msg]);
			}
		} else if (sessionUpdate === "tool_call_update") {
			const toolCallId = update.toolCallId as string | undefined;
			const title = update.title as string | undefined;
			const status = update.status as
				| import("../../shared/types/extension.js").ToolCallStatus
				| undefined;
			const kind = update.kind as import("../../shared/types/extension.js").ToolKind | undefined;
			const rawContent = update.content as Array<Record<string, unknown>> | undefined;
			const rawLocations = update.locations as Array<Record<string, unknown>> | undefined;
			if (!toolCallId) return;

			const content: import("../../shared/types/extension.js").ToolCallContent[] | undefined =
				rawContent?.map((c) => {
					const t = c.type as string;
					if (t === "diff") {
						return {
							type: "diff",
							diff: {
								path: c.path as string,
								newText: c.newText as string,
								oldText: c.oldText as string | undefined,
							},
						};
					}
					if (t === "terminal") {
						return { type: "terminal", terminalId: c.terminalId as string };
					}
					const contentBlock = c.content as Record<string, unknown> | undefined;
					if (contentBlock?.type === "image") {
						return {
							type: "image",
							data: contentBlock.data as string,
							mimeType: contentBlock.mimeType as string,
						};
					}
					if (contentBlock?.type === "audio") {
						return {
							type: "audio",
							data: contentBlock.data as string,
							mimeType: contentBlock.mimeType as string,
						};
					}
					return {
						type: "content",
						content: (contentBlock?.text as string | undefined) ?? JSON.stringify(contentBlock),
					};
				});

			const locations: import("../../shared/types/extension.js").ToolCallLocation[] | undefined =
				rawLocations?.map((l) => ({
					path: l.path as string,
					line: l.line as number | undefined,
				}));

			const existing = this.sessionMessages.get(sessionId) ?? [];
			const lastMsg = existing[existing.length - 1];
			if (lastMsg && lastMsg.role === "assistant") {
				if (!lastMsg.toolCalls) lastMsg.toolCalls = [];
				const existingCall = lastMsg.toolCalls.find((tc) => tc.id === toolCallId);
				if (existingCall) {
					if (status) existingCall.status = status;
					if (kind) existingCall.kind = kind;
					if (content) existingCall.content = content;
					if (locations) existingCall.locations = locations;
					if (status === "completed" || status === "failed") {
						existingCall.result =
							update.rawOutput != null ? JSON.stringify(update.rawOutput) : existingCall.result;
						existingCall.isError = status === "failed";
					}
				} else {
					lastMsg.toolCalls.push({
						id: toolCallId,
						name: title ?? kind ?? "tool",
						arguments: update.rawInput != null ? JSON.stringify(update.rawInput) : "",
						result:
							status === "completed" || status === "failed"
								? update.rawOutput != null
									? JSON.stringify(update.rawOutput)
									: undefined
								: undefined,
						isError: status === "failed",
						kind,
						status,
						content,
						locations,
					});
				}
				if (!lastMsg.chunks) lastMsg.chunks = [];
				const lastChunk = lastMsg.chunks[lastMsg.chunks.length - 1];
				if (!lastChunk || lastChunk.type !== "tool_call" || lastChunk.content !== toolCallId) {
					lastMsg.chunks.push({
						type: "tool_call",
						content: toolCallId,
						timestamp: Date.now(),
					});
				}
				const rawOutput = update.rawOutput as Record<string, unknown> | undefined;
				const metadata = rawOutput?.metadata as Record<string, unknown> | undefined;
				if (metadata?.sessionId && typeof metadata.sessionId === "string") {
					lastMsg.subAgentId = metadata.sessionId;
				}
			}
		} else if (sessionUpdate === "clear_conversation") {
			this.sessionMessages.delete(sessionId);
			this.sessionUpdates.delete(sessionId);
			this.state.unpersistSession(sessionId);
			this.removeSessionFromFile(sessionId);
		} else if (sessionUpdate === "available_commands_update") {
			const commands = (update.availableCommands as Array<{ name: string; description: string }>) ?? [];
			Logger.getInstance().info(`available_commands_update for session ${sessionId}: ${commands.length} commands`);
			this.bridge.postMessage({
				type: "session_update",
				sessionId,
				update: update as unknown as import("../../shared/types/acp.js").SessionUpdate,
			});
		} else if (sessionUpdate === "usage_update") {
			const existing = this.sessionMessages.get(sessionId) ?? [];
			const lastMsg = existing[existing.length - 1];
			if (lastMsg && lastMsg.role === "assistant") {
				const cost = update.cost as { amount?: number; currency?: string } | undefined;
				lastMsg.usage = {
					tokensUsed: update.used as number | undefined,
					tokensTotal: update.size as number | undefined,
					costAmount: cost?.amount,
					costCurrency: cost?.currency,
				};
			}
		}

		if (sessionId === this.state.activeSession) {
			const msgs = this.sessionMessages.get(sessionId) ?? [];
			this.bridge.postMessage({ type: "session_messages", sessionId, messages: msgs });
		}
	}

	private async sendPrompt(sessionId: string, prompt: string, attachments?: import("../../shared/types/extension.js").FileAttachment[]): Promise<void> {
		const agentId = this.state.activeAgent;
		if (!agentId) return;

		this._cancelledSessions.delete(sessionId);
		this._cancelledMessageIds.clear();
		this._promptGeneration++;
		this._acceptedGeneration = this._promptGeneration;
		this.state.ensureSessionPersisted(sessionId);
		this.state.markSessionPrompted(sessionId);

		const connection = this.registry.get(agentId);
		if (!connection?.isConnected) return;

		const session = connection.getSession(sessionId);
		if (!session) {
			this.state.setActiveSession(null);
			this.state.setConfigOptions([]);
			vscode.window.showWarningMessage(vscode.l10n.t("Session expired. Creating a new session..."));
			vscode.commands.executeCommand("vscodeAcp.newSession");
			return;
		}

		const existing = this.sessionMessages.get(sessionId) ?? [];
		let displayContent = prompt;
		if (attachments && attachments.length > 0) {
			const fileLinks = attachments.map((a) => {
				const relPath = vscode.workspace.asRelativePath(a.path);
				return a.isDirectory ? `📁 [${a.name}](${relPath})` : `📄 [${a.name}](${relPath})`;
			});
			displayContent = `${fileLinks.join(" ")}\n\n${prompt}`;
		}
		const userMsg: import("../../shared/types/extension.js").Message = {
			id: `user_${Date.now()}`,
			sessionId,
			role: "user",
			content: displayContent,
			timestamp: Date.now(),
		};
		this.sessionMessages.set(sessionId, [...existing, userMsg]);
		if (sessionId === this.state.activeSession) {
			this.bridge.postMessage({
				type: "session_messages",
				sessionId,
				messages: this.sessionMessages.get(sessionId) ?? [],
			});
		}

		this._promptStartTimes.set(sessionId, Date.now());
		const configOptions = this.state.configOptions;
		const modelOption = configOptions.find((o) => o.category === "model" && o.type === "select");
		let modelName: string | undefined;
		if (modelOption && modelOption.type === "select") {
			const flat = "group" in (modelOption.options[0] ?? {})
				? (modelOption.options as { options: { name?: string; value?: string }[] }[]).flatMap((g) => g.options)
				: modelOption.options as { name?: string; value?: string }[];
			const active = flat.find((o) => o.value === modelOption.currentValue);
			modelName = active?.name;
		}

		try {
			this.bridge.postMessage({ type: "stream_start", sessionId });
			await connection.prompt(sessionId, prompt, attachments);
		} catch (err) {
			vscode.window.showErrorMessage(
				vscode.l10n.t("Prompt failed: {0}", err instanceof Error ? err.message : String(err)),
			);
		} finally {
			const startTime = this._promptStartTimes.get(sessionId);
			const durationMs = startTime ? Date.now() - startTime : undefined;
			this.bridge.postMessage({ type: "stream_end", sessionId, durationMs, modelName });
			this._promptStartTimes.delete(sessionId);
			this.saveSessionToFile(sessionId);
		}
	}

	private async setConfig(sessionId: string, configId: string, value: string): Promise<void> {
		const agentId = this.state.activeAgent;
		if (!agentId) return;

		const connection = this.registry.get(agentId);
		if (!connection?.isConnected) return;

		const session = connection.getSession(sessionId);
		if (!session) {
			Logger.getInstance().warn(`setConfig: session ${sessionId} not found, clearing stale state`);
			this.state.setActiveSession(null);
			this.state.setConfigOptions([]);
			vscode.window.showWarningMessage(vscode.l10n.t("Session expired. Creating a new session..."));
			vscode.commands.executeCommand("vscodeAcp.newSession");
			return;
		}

		try {
			await connection.setConfigOption(sessionId, configId, value);
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err);
			Logger.getInstance().error(`setConfig FAILED: ${errMsg}`);
			vscode.window.showErrorMessage(vscode.l10n.t("Config change failed: {0}", errMsg));
		}
	}

	private async cancelPrompt(sessionId: string): Promise<void> {
		const agentId = this.state.activeAgent;
		if (!agentId) return;

		const connection = this.registry.get(agentId);
		if (!connection?.isConnected) return;

		this._cancelledSessions.add(sessionId);
		this._promptGeneration++;
		const existing = this.sessionMessages.get(sessionId) ?? [];
		const lastAssistant = [...existing].reverse().find((m) => m.role === "assistant");
		if (lastAssistant) {
			this._cancelledMessageIds.add(lastAssistant.id);
		}

		try {
			await connection.cancel(sessionId);
		} catch (err) {
			vscode.window.showErrorMessage(
				vscode.l10n.t("Cancel failed: {0}", err instanceof Error ? err.message : String(err)),
			);
		}
	}

	updateCachedFromSession(
		agentId: string,
		configOptions: SessionConfigOption[],
		modelsState?: import("../../shared/types/acp.js").SessionModelState,
		modesState?: { availableModes?: Array<{ id: string; name: string; description?: string | null }>; currentModeId?: string | null },
	): void {
		let cachedModels: CachedModel[] | undefined;

		const modelOption = configOptions.find((o) => o.category === "model" && o.type === "select");
		if (modelOption && modelOption.type === "select") {
			const flat = "group" in (modelOption.options[0] ?? {})
				? (modelOption.options as { options: { name?: string; value?: string }[] }[]).flatMap((g) => g.options)
				: modelOption.options as { name?: string; value?: string }[];
			cachedModels = flat.map((o) => ({
				id: o.value ?? o.name ?? "",
				name: o.name ?? o.value ?? "",
				value: o.value ?? "",
			}));
		} else if (modelsState?.availableModels?.length) {
			cachedModels = modelsState.availableModels.map((m) => ({
				id: m.modelId,
				name: m.name,
				value: m.modelId,
			}));
		}

		let cachedRoles: CachedRole[] | undefined;
		if (modesState?.availableModes?.length) {
			const seen = new Set<string>();
			cachedRoles = modesState.availableModes
				.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
				.map((m) => ({ id: m.id, name: m.name, description: m.description ?? undefined }));
		}

		if (cachedModels?.length || cachedRoles?.length) {
			this.configManager.updateCachedModelsAndRoles(
				agentId,
				cachedModels,
				cachedRoles,
			).catch((err) => {
				Logger.getInstance().error("updateCachedModelsAndRoles FAILED: " + err);
			});
		}
	}
}
