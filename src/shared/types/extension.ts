import type { AgentConfig, Session, SessionConfigOption, SessionUpdate } from "./acp";

export type { SessionConfigOption };

export interface AgentRole {
	id: string;
	name: string;
	description?: string;
}

export type MentionItem =
	| { type: "role"; id: string; name: string; description?: string }
	| { type: "tool"; kind: string; name: string; description: string }
	| { type: "action"; action: "browse-files" | "browse-folders"; name: string; description: string };

export interface FileAttachment {
	path: string;
	name: string;
	isDirectory: boolean;
}

export interface ExtensionState {
	activeAgent: string | null;
	activeSession: string | null;
	agents: AgentInfo[];
	sessions: SessionSummary[];
	configOptions: SessionConfigOption[];
	connectionError: string | null;
	agentRoles: AgentRole[];
	activeRole: string | null;
	locale?: string;
}

export interface AgentInfo {
	config: AgentConfig;
	status: "connected" | "disconnected" | "connecting" | "error";
	error?: string;
}

export interface SessionSummary {
	id: string;
	title: string;
	agentId: string;
	createdAt: number;
	updatedAt: number;
	messageCount: number;
}

export interface MessageUsage {
	tokensUsed?: number;
	tokensTotal?: number;
	costAmount?: number;
	costCurrency?: string;
}

export interface Message {
	id: string;
	sessionId: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: number;
	chunks?: MessageChunkData[];
	toolCalls?: ToolCallData[];
	subAgentId?: string;
	subAgentMessages?: Message[];
	usage?: MessageUsage;
	durationMs?: number;
	modelName?: string;
}

export interface MessageChunkData {
	type: "text" | "thought" | "tool_call" | "tool_result";
	content: string;
	timestamp: number;
}

export type ToolKind =
	| "read"
	| "edit"
	| "delete"
	| "move"
	| "search"
	| "execute"
	| "think"
	| "fetch"
	| "switch_mode"
	| "other";
export type ToolCallStatus = "pending" | "in_progress" | "completed" | "failed";

export interface ToolCallDiff {
	path: string;
	newText: string;
	oldText?: string;
}

export interface ToolCallLocation {
	path: string;
	line?: number;
}

export interface ToolCallContent {
	type: "content" | "diff" | "terminal" | "image" | "audio";
	content?: string;
	diff?: ToolCallDiff;
	terminalId?: string;
	data?: string;
	mimeType?: string;
}

export interface ToolCallData {
	id: string;
	name: string;
	arguments: string;
	result?: string;
	isError?: boolean;
	kind?: ToolKind;
	status?: ToolCallStatus;
	content?: ToolCallContent[];
	locations?: ToolCallLocation[];
}

export type ExtensionMessage =
	| { type: "state_update"; state: ExtensionState }
	| { type: "session_messages"; sessionId: string; messages: Message[] }
	| { type: "stream_chunk"; sessionId: string; chunk: MessageChunkData }
	| { type: "stream_end"; sessionId: string; durationMs?: number; modelName?: string }
	| { type: "session_update"; sessionId: string; update: SessionUpdate }
	| { type: "agent_reconnecting"; attempt: number }
	| { type: "agent_reconnect_failed" }
	| { type: "open_command_popup"; popup: "sessions" | "models" }
	| { type: "role_update"; agentRoles: AgentRole[]; activeRole: string | null }
	| { type: "file_dialog_result"; files: FileAttachment[] };

export type WebviewMessage =
	| { type: "select_agent"; agentId: string }
	| { type: "new_session" }
	| { type: "switch_session"; sessionId: string }
	| { type: "send_prompt"; sessionId: string; prompt: string; attachments?: FileAttachment[] }
	| { type: "cancel_prompt"; sessionId: string }
	| { type: "set_config"; sessionId: string; configId: string; value: string }
	| { type: "disconnect_agent" }
	| { type: "slash_command"; command: string; args: string }
	| { type: "delete_session"; sessionId: string }
	| { type: "clear_empty_sessions" }
	| { type: "switch_role"; roleId: string }
	| { type: "pick_files"; canSelectFiles: boolean; canSelectFolders: boolean };
