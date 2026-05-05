import type { AgentConfig } from "../shared/types/acp.js";
import { AgentConnection } from "./AgentConnection.js";
import { EventEmitter } from "../shared/EventEmitter.js";

interface AgentRegistryEvents {
	agentAdded: AgentConnection;
	agentRemoved: string;
	agentUpdated: AgentConnection;
	sessionUpdate: { sessionId: string; update: unknown };
	configChanged: { sessionId: string; options: unknown[] };
	stateChanged: { agentId: string; state: { connected: boolean; initialized: boolean } };
	reconnecting: { agentId: string; attempt: number };
	reconnectFailed: { agentId: string };
}

export class AgentRegistry extends EventEmitter<AgentRegistryEvents> {
	private agents = new Map<string, AgentConnection>();
	private connectionSubs = new Map<string, Set<() => void>>();

	getAll(): AgentConnection[] {
		return Array.from(this.agents.values());
	}

	get(id: string): AgentConnection | undefined {
		return this.agents.get(id);
	}

	add(connection: AgentConnection) {
		this.agents.set(connection.config.id, connection);
		this.forwardConnectionEvents(connection);
		this.emit("agentAdded", connection);
	}

	remove(id: string) {
		const existing = this.agents.get(id);
		if (existing) {
			this.teardownForwarding(id);
			this.agents.delete(id);
			this.emit("agentRemoved", id);
		}
	}

	update(id: string, connection: AgentConnection) {
		this.teardownForwarding(id);
		this.agents.set(id, connection);
		this.forwardConnectionEvents(connection);
		this.emit("agentUpdated", connection);
	}

	has(id: string): boolean {
		return this.agents.has(id);
	}

	get count(): number {
		return this.agents.size;
	}

	async disconnectAll() {
		const promises = Array.from(this.agents.values()).map((conn) =>
			conn.disconnect().catch(() => {}),
		);
		await Promise.all(promises);
		this.agents.clear();
		for (const subs of this.connectionSubs.values()) {
			for (const unsub of subs) unsub();
		}
		this.connectionSubs.clear();
	}

	static fromConfigs(configs: AgentConfig[]): AgentRegistry {
		const registry = new AgentRegistry();
		for (const config of configs) {
			registry.add(new AgentConnection(config));
		}
		return registry;
	}

	private forwardConnectionEvents(conn: AgentConnection) {
		const unsubs = new Set<() => void>();
		unsubs.add(conn.on("sessionUpdate", (e) => this.emit("sessionUpdate", e)));
		unsubs.add(conn.on("configChanged", (e) => this.emit("configChanged", e)));
		unsubs.add(
			conn.on("stateChanged", (state) =>
				this.emit("stateChanged", { agentId: conn.config.id, state }),
			),
		);
		unsubs.add(
			conn.on("reconnecting", (e) =>
				this.emit("reconnecting", { agentId: conn.config.id, attempt: e.attempt }),
			),
		);
		unsubs.add(
			conn.on("reconnectFailed", () =>
				this.emit("reconnectFailed", { agentId: conn.config.id }),
			),
		);
		this.connectionSubs.set(conn.config.id, unsubs);
	}

	private teardownForwarding(id: string) {
		const subs = this.connectionSubs.get(id);
		if (subs) {
			for (const unsub of subs) unsub();
			this.connectionSubs.delete(id);
		}
	}
}
