import type {
	AgentInfo,
	AgentRole,
	ExtensionState,
	FileAttachment,
	Message,
	SessionConfigOption,
	SessionSummary,
} from "@shared/types/extension";
import { create } from "zustand";
import { getVsCodeState, onMessage, postMessage, setVsCodeState } from "../api/vscode";
import { setLocale } from "../i18n";

interface UIState {
	activeAgent: string | null;
	activeSession: string | null;
	agents: AgentInfo[];
	sessions: SessionSummary[];
	configOptions: SessionConfigOption[];
	connectionError: string | null;
	agentRoles: AgentRole[];
	activeRole: string | null;
	reconnectFailed: boolean;
	slashCommands: { name: string; description: string }[];
	commandPopup: "sessions" | "models" | null;
	sessionMenuOpen: boolean;

	messages: Map<string, Message[]>;
	isStreaming: boolean;
	queuedPrompts: string[];
	inputText: string;
	isCommandMenuOpen: boolean;
	escCancelTimer: number | null;
	attachments: FileAttachment[];
	pastedSnippets: { id: string; preview: string; fullText: string; charCount: number }[];
	mentionMenuOpen: boolean;
	_cancelledStreamPending: boolean;
	locale: string;

	setState(state: ExtensionState): void;
	setMessages(sessionId: string, messages: Message[]): void;
	setInputText(text: string): void;
	setCommandMenuOpen(open: boolean): void;
	setEscCancelTimer(timer: number | null): void;
	sendMessage(prompt: string): void;
	setConfig(configId: string, value: string): void;
	selectAgent(agentId: string): void;
	newSession(): void;
	switchSession(sessionId: string): void;
	deleteSession(sessionId: string): void;
	cancelPrompt(): void;
	reconnectAgent(): void;
	openCommandPopup(popup: "sessions" | "models"): void;
	closeCommandPopup(): void;
	removeQueuedPrompt(index: number): void;
	sendQueuedPromptNow(index: number): void;
	openSessionMenu(): void;
	closeSessionMenu(): void;
	switchRole(roleId: string): void;
	setAgentRoles(roles: AgentRole[], activeRole: string | null): void;
	addAttachment(attachment: FileAttachment): void;
	addAttachments(attachments: FileAttachment[]): void;
	removeAttachment(index: number): void;
	clearAttachments(): void;
	addPastedSnippet(snippet: { id: string; preview: string; fullText: string; charCount: number }): void;
	removePastedSnippet(index: number): void;
	setMentionMenuOpen(open: boolean): void;
}

interface PersistedState {
	messages: [string, Message[]][];
}

function persistMessages(messages: Map<string, Message[]>): void {
	const data: PersistedState = { messages: Array.from(messages.entries()) };
	setVsCodeState(data);
}

function restoreMessages(): Map<string, Message[]> {
	try {
		const data = getVsCodeState() as PersistedState | null | undefined;
		if (data?.messages && Array.isArray(data.messages)) {
			return new Map(data.messages);
		}
	} catch {}
	return new Map();
}

export const useStore = create<UIState>((set, get) => {
	onMessage((msg) => {
		switch (msg.type) {
			case "state_update": {
				const newActiveSession = msg.state.activeSession;
				const incomingConfig = msg.state.configOptions ?? [];
				const incomingRoles = msg.state.agentRoles ?? [];
				const currentAgents = get().agents;
				const mergedAgents = (msg.state.agents ?? []).map((incoming: any) => {
					const current = currentAgents.find((a) => a.config.id === incoming.config.id);
					if (current?.status === "connecting" && incoming.status !== "connected") {
						return { ...incoming, status: "connecting" as const };
					}
					return incoming;
				});
				const localeUpdate = msg.state.locale ? { locale: msg.state.locale } : {};
				if (msg.state.locale) setLocale(msg.state.locale);
				set({
					activeAgent: msg.state.activeAgent,
					activeSession: newActiveSession,
					agents: mergedAgents,
					sessions: msg.state.sessions,
					configOptions: incomingConfig,
					connectionError: msg.state.connectionError ?? null,
					agentRoles: incomingRoles,
					activeRole: msg.state.activeRole ?? null,
					...localeUpdate,
				});
				break;
			}
			case "role_update":
				set({
					agentRoles: msg.agentRoles ?? [],
					activeRole: msg.activeRole ?? null,
				});
				break;
		case "session_messages":
			set((state) => {
				const messages = new Map(state.messages);
				messages.set(msg.sessionId, msg.messages);
				return { messages };
			});
			break;
			case "stream_start":
				set({ isStreaming: true });
				break;
			case "stream_end":
				if (get()._cancelledStreamPending) {
					set({ _cancelledStreamPending: false });
					break;
				}
				set((state) => {
					const next = state.queuedPrompts[0];
					const remaining = state.queuedPrompts.slice(1);
					if (next) {
						if (next.startsWith("/")) {
							const spaceIdx = next.indexOf(" ");
							const command = spaceIdx === -1 ? next.slice(1) : next.slice(1, spaceIdx);
							const args = spaceIdx === -1 ? "" : next.slice(spaceIdx + 1);
							postMessage({ type: "slash_command", command, args });
						} else {
							const sessionId = state.activeSession;
							if (sessionId) {
								postMessage({ type: "send_prompt", sessionId, prompt: next });
							}
						}
						return {
							isStreaming: true,
							queuedPrompts: remaining,
							inputText: "",
						};
					}
					return {
						isStreaming: false,
					};
				});
				break;
			case "session_update": {
				const update = msg.update as Record<string, unknown>;
				if (update?.sessionUpdate === "slash_commands") {
					set({
						slashCommands: (update.commands as { name: string; description: string }[]) ?? [],
					});
					break;
				}
				if (update?.sessionUpdate === "current_mode_update") {
					set({ activeRole: (update.currentModeId as string) ?? null });
					break;
				}
				if (update?.sessionUpdate === "slash_command_error") {
					set({ connectionError: update.error as string });
					break;
				}
				if (update?.sessionUpdate === "config_option_update") {
					set({ configOptions: (update.configOptions as SessionConfigOption[]) ?? [] });
					break;
				}
				if (update?.sessionUpdate === "available_commands_update") {
					const agentCommands = (
						(update.availableCommands as Array<{ name: string; description: string }>) ?? []
					).map((c) => ({ name: `/${c.name}`, description: c.description }));
					set({ slashCommands: agentCommands });
					break;
				}
				if (update?.sessionUpdate === "clear_conversation") {
					set((state) => {
						const messages = new Map(state.messages);
						messages.delete(msg.sessionId);
						messages.delete("__pending__");
						return { messages };
					});
					break;
				}
				if (update?.sessionUpdate === "session_info_update") {
					const newTitle = (update as Record<string, unknown>).title as string | undefined;
					if (newTitle) {
						set((state) => ({
							sessions: state.sessions.map((s) =>
								s.id === msg.sessionId ? { ...s, title: newTitle } : s
							),
						}));
					}
					break;
				}
				break;
			}
			case "agent_reconnecting":
				set({ reconnectFailed: false });
				break;
			case "agent_reconnect_failed":
				set({ reconnectFailed: true });
				break;
			case "open_command_popup":
				set({ commandPopup: msg.popup as "sessions" | "models" });
				break;
			case "file_dialog_result":
				if (msg.files && msg.files.length > 0) {
					set((state) => ({
						attachments: [...state.attachments, ...msg.files],
					}));
				}
				break;
		}
	});

	return {
		activeAgent: null,
		activeSession: null,
		agents: [],
		sessions: [],
		configOptions: [],
		connectionError: null,
		agentRoles: [],
		activeRole: null,
		reconnectFailed: false,
		slashCommands: [],
		commandPopup: null,
		sessionMenuOpen: false,
		messages: restoreMessages(),
		isStreaming: false,
		queuedPrompts: [],
		inputText: "",
		isCommandMenuOpen: false,
		escCancelTimer: null,
		attachments: [],
		pastedSnippets: [],
		mentionMenuOpen: false,
		_cancelledStreamPending: false,
		locale: "en",

		setState(state: ExtensionState) {
			set({
				activeAgent: state.activeAgent,
				activeSession: state.activeSession,
				agents: state.agents,
				sessions: state.sessions,
				configOptions: state.configOptions,
				connectionError: state.connectionError ?? null,
				agentRoles: state.agentRoles ?? [],
				activeRole: state.activeRole ?? null,
				reconnectFailed: false,
			});
		},

		setMessages(sessionId: string, messages: Message[]) {
			set((state) => {
				const map = new Map(state.messages);
				map.set(sessionId, messages);
				return { messages: map };
			});
		},

		setInputText(text: string) {
			set({ inputText: text });
		},

		setCommandMenuOpen(open: boolean) {
			set({ isCommandMenuOpen: open });
		},

		setEscCancelTimer(timer: number | null) {
			set({ escCancelTimer: timer });
		},

		sendMessage(prompt: string) {
			const { activeSession, isStreaming, queuedPrompts, attachments, pastedSnippets } = get();
			const fullPrompt = pastedSnippets.length > 0
				? prompt + "\n<clipboard>\n" + pastedSnippets.map((s) => s.fullText).join("\n") + "\n</clipboard>"
				: prompt;
			if (isStreaming) {
				set({ queuedPrompts: [...queuedPrompts, fullPrompt], inputText: "", pastedSnippets: [] });
				return;
			}
			const sessionId = activeSession ?? "";
			postMessage({ type: "send_prompt", sessionId, prompt: fullPrompt, attachments: attachments.length > 0 ? attachments : undefined });
			set({ inputText: "", isStreaming: true, attachments: [], pastedSnippets: [] });
		},

		setConfig(configId: string, value: string) {
			const { activeSession } = get();
			if (!activeSession) return;
			postMessage({ type: "set_config", sessionId: activeSession, configId, value });
		},

		selectAgent(agentId: string) {
			const agents = get().agents.map((a) =>
				a.config.id === agentId ? { ...a, status: "connecting" as const } : a,
			);
			set({ agents });
			postMessage({ type: "select_agent", agentId });
		},

		newSession() {
			const { messages } = get();
			const newMessages = new Map(messages);
			newMessages.delete("__pending__");
			set({
				activeSession: null,
				isStreaming: false,
				queuedPrompts: [],
				messages: newMessages,
			});
			postMessage({ type: "new_session" });
		},

		switchSession(sessionId: string) {
			postMessage({ type: "switch_session", sessionId });
			set({ isStreaming: false });
		},

		deleteSession(sessionId: string) {
			postMessage({ type: "delete_session", sessionId });
			const { sessions, activeSession, messages, isStreaming } = get();
			const newMessages = new Map(messages);
			newMessages.delete(sessionId);
			set({
				sessions: sessions.filter((s) => s.id !== sessionId),
				activeSession: activeSession === sessionId ? null : activeSession,
				messages: newMessages,
				isStreaming: activeSession === sessionId ? false : isStreaming,
			});
		},

		clearEmptySessions() {
			postMessage({ type: "clear_empty_sessions" });
			const { sessions, activeSession, messages, isStreaming } = get();
			const emptyIds = new Set(sessions.filter((s) => s.messageCount === 0).map((s) => s.id));
			const newMessages = new Map(messages);
			for (const id of emptyIds) newMessages.delete(id);
			set({
				sessions: sessions.filter((s) => !emptyIds.has(s.id)),
				activeSession: activeSession && emptyIds.has(activeSession) ? null : activeSession,
				messages: newMessages,
				isStreaming: activeSession && emptyIds.has(activeSession) ? false : isStreaming,
			});
		},

		cancelPrompt() {
			const { activeSession, queuedPrompts } = get();
			if (activeSession) {
				postMessage({ type: "cancel_prompt", sessionId: activeSession });
			}
			if (queuedPrompts.length > 0) {
				const next = queuedPrompts[0];
				const remaining = queuedPrompts.slice(1);
				if (next.startsWith("/")) {
					const spaceIdx = next.indexOf(" ");
					const command = spaceIdx === -1 ? next.slice(1) : next.slice(1, spaceIdx);
					const args = spaceIdx === -1 ? "" : next.slice(spaceIdx + 1);
					postMessage({ type: "slash_command", command, args });
				} else {
					const sessionId = activeSession ?? "";
					postMessage({ type: "send_prompt", sessionId, prompt: next });
				}
				set({ isStreaming: true, queuedPrompts: remaining, _cancelledStreamPending: true });
			} else {
				set({ isStreaming: false });
			}
		},

		reconnectAgent() {
			postMessage({ type: "select_agent", agentId: get().activeAgent ?? "" });
			set({ reconnectFailed: false });
		},

		openCommandPopup(popup: "sessions" | "models") {
			set({ commandPopup: popup, isCommandMenuOpen: false });
		},

		closeCommandPopup() {
			set({ commandPopup: null });
		},

		openSessionMenu() {
			set({ sessionMenuOpen: true });
		},

		closeSessionMenu() {
			set({ sessionMenuOpen: false });
		},

		removeQueuedPrompt(index: number) {
			set((state) => ({
				queuedPrompts: state.queuedPrompts.filter((_, i) => i !== index),
			}));
		},

		sendQueuedPromptNow(index: number) {
			const { activeSession, queuedPrompts } = get();
			const prompt = queuedPrompts[index];
			if (!prompt) return;
			if (activeSession) {
				postMessage({ type: "cancel_prompt", sessionId: activeSession });
			}
			if (prompt.startsWith("/")) {
				const spaceIdx = prompt.indexOf(" ");
				const command = spaceIdx === -1 ? prompt.slice(1) : prompt.slice(1, spaceIdx);
				const args = spaceIdx === -1 ? "" : prompt.slice(spaceIdx + 1);
				postMessage({ type: "slash_command", command, args });
			} else {
				const sessionId = activeSession ?? "";
				postMessage({ type: "send_prompt", sessionId, prompt });
			}
			const remaining = queuedPrompts.filter((_, i) => i !== index);
			set({ isStreaming: true, queuedPrompts: remaining, _cancelledStreamPending: true });
		},

		switchRole(roleId: string) {
			postMessage({ type: "switch_role", roleId });
			set({ activeRole: roleId });
		},

		setAgentRoles(roles: AgentRole[], activeRole: string | null) {
			set({ agentRoles: roles, activeRole });
		},

		addAttachment(attachment: FileAttachment) {
			set((state) => ({
				attachments: [...state.attachments, attachment],
			}));
		},

		addAttachments(newAttachments: FileAttachment[]) {
			set((state) => ({
				attachments: [...state.attachments, ...newAttachments],
			}));
		},

		removeAttachment(index: number) {
			set((state) => ({
				attachments: state.attachments.filter((_, i) => i !== index),
			}));
		},

		clearAttachments() {
			set({ attachments: [] });
		},

		addPastedSnippet(snippet: { id: string; preview: string; fullText: string; charCount: number }) {
			set((state) => ({
				pastedSnippets: [...state.pastedSnippets, snippet],
			}));
		},

		removePastedSnippet(index: number) {
			set((state) => ({
				pastedSnippets: state.pastedSnippets.filter((_, i) => i !== index),
			}));
		},

		setMentionMenuOpen(open: boolean) {
			set({ mentionMenuOpen: open });
		},
	};
});

let lastPersistedHash = "";
useStore.subscribe((state) => {
	const entries = state.messages.entries();
	const hash = JSON.stringify(Array.from(entries));
	if (hash !== lastPersistedHash) {
		lastPersistedHash = hash;
		persistMessages(state.messages);
	}
});
