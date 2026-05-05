import type {
	AgentCapabilities,
	ClientCapabilities,
	InitializeResponse,
	SessionConfigOption,
	SessionId,
	SessionModeState,
	SessionModelState,
	SessionNotification,
	SessionUpdate,
} from "@agentclientprotocol/sdk";

export interface CachedModel {
	id: string;
	name: string;
	value: string;
}

export interface CachedRole {
	id: string;
	name: string;
	description?: string;
}

export interface AgentConfig {
	id: string;
	name: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cachedModels?: CachedModel[];
	cachedRoles?: CachedRole[];
}

export interface Session {
	id: string;
	agentId: string;
	cwd: string;
	configOptions: SessionConfigOption[];
	modes?: SessionModeState;
	models?: SessionModelState;
	status: "active" | "idle" | "closed";
}

export type ProtocolEvent =
	| { type: "session_created"; session: Session }
	| { type: "session_closed"; sessionId: string }
	| { type: "session_update"; sessionId: string; update: SessionUpdate }
	| { type: "config_changed"; sessionId: string; options: SessionConfigOption[] }
	| { type: "connection_closed"; agentId: string }
	| { type: "error"; agentId: string; error: Error };

export interface AgentConnectionState {
	connected: boolean;
	initialized: boolean;
	agentInfo?: InitializeResponse;
}

export type {
	AgentCapabilities,
	ClientCapabilities,
	InitializeResponse,
	SessionConfigOption,
	SessionId,
	SessionModeState,
	SessionModelState,
	SessionNotification,
	SessionUpdate,
};
