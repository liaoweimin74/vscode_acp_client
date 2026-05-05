import * as vscode from "vscode";
import type { ExtensionState, AgentInfo, SessionSummary, SessionConfigOption } from "../shared/types/extension.js";
import { Logger } from "./Logger.js";

const STORAGE_KEY = "vscodeAcp.state";
const SESSION_META_KEY = "vscodeAcp.sessionMeta";
const DELETED_SESSIONS_KEY = "vscodeAcp.deletedSessionsByAgent";
const PROMPTED_SESSIONS_KEY = "vscodeAcp.promptedSessions";

interface SessionMeta {
	title: string;
	createdAt: number;
	agentId: string;
}

export class StateManager {
	private _state: ExtensionState;
	private _sessionMeta: Record<string, SessionMeta> = {};
	private _deletedByAgent: Record<string, string[]> = {};
	private _promptedSessions = new Set<string>();
	private readonly _onDidChange = new vscode.EventEmitter<ExtensionState>();
	readonly onDidChange = this._onDidChange.event;
	private _batchDepth = 0;
	private _batchDirty = false;

	constructor(private readonly storage: vscode.Memento) {
		const stored = this.storage.get<ExtensionState>(STORAGE_KEY);
		this._sessionMeta = this.storage.get<Record<string, SessionMeta>>(SESSION_META_KEY) ?? {};
		this._deletedByAgent = this.storage.get<Record<string, string[]>>(DELETED_SESSIONS_KEY) ?? {};
		const promptedArr = this.storage.get<string[]>(PROMPTED_SESSIONS_KEY) ?? [];
		this._promptedSessions = new Set(promptedArr);

		const migrated = this.migrateOldSessions(stored?.sessions);
		if (migrated) {
			this.storage.update(SESSION_META_KEY, this._sessionMeta);
		}

		this._state = {
			activeAgent: stored?.activeAgent ?? null,
			activeSession: stored?.activeSession ?? null,
			agents: stored?.agents ?? [],
			sessions: this.buildSessionsFromMeta(),
			configOptions: stored?.configOptions ?? [],
			connectionError: null,
			agentRoles: [],
			activeRole: null,
		};
	}

	private migrateOldSessions(oldSessions: SessionSummary[] | undefined): boolean {
		if (!oldSessions?.length) return false;
		if (Object.keys(this._sessionMeta).length > 0) return false;

		const oldPattern = /^Session ses_/;
		const used = new Set<string>();
		for (const s of oldSessions) {
			let title = s.title;
			if (oldPattern.test(title)) {
				const date = new Date(s.createdAt);
				const pad = (n: number) => n.toString().padStart(2, "0");
				const base = `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
				title = base;
				let counter = 1;
				while (used.has(title)) {
					title = `${base} (${counter})`;
					counter++;
				}
			}
			used.add(title);
			this._sessionMeta[s.id] = { title, createdAt: s.createdAt, agentId: s.agentId };
		}
		return true;
	}

	private buildSessionsFromMeta(): SessionSummary[] {
		return Object.entries(this._sessionMeta).map(([id, meta]) => ({
			id,
			title: meta.title,
			agentId: meta.agentId,
			createdAt: meta.createdAt,
			updatedAt: meta.createdAt,
			messageCount: 0,
		})).sort((a, b) => b.createdAt - a.createdAt);
	}

	get state(): ExtensionState {
		return this._state;
	}

	get activeAgent(): string | null {
		return this._state.activeAgent;
	}

	get activeSession(): string | null {
		return this._state.activeSession;
	}

	get configOptions(): SessionConfigOption[] {
		return this._state.configOptions;
	}

	private fireDidChange(): void {
		if (this._batchDepth > 0) {
			this._batchDirty = true;
			return;
		}
		this._onDidChange.fire(this._state);
	}

	batch<T>(fn: () => T): T {
		this._batchDepth++;
		try {
			return fn();
		} finally {
			this._batchDepth--;
			if (this._batchDepth === 0 && this._batchDirty) {
				this._batchDirty = false;
				this._onDidChange.fire(this._state);
			}
		}
	}

	update(partial: Partial<ExtensionState>): void {
		const filtered = Object.fromEntries(
			Object.entries(partial).filter(([, v]) => v !== undefined)
		);
		this._state = { ...this._state, ...filtered };
		const log = Logger.getInstance();
		log.debug(`update called, firing onDidChange`);
		this.fireDidChange();
		this.persist();
	}

	setActiveAgent(agentId: string | null): void {
		this.update({ activeAgent: agentId });
	}

	setActiveSession(sessionId: string | null): void {
		this.update({ activeSession: sessionId });
	}

	setAgents(agents: AgentInfo[]): void {
		this.update({ agents });
	}

	setSessions(sessions: SessionSummary[]): void {
		this._state.sessions = sessions;
		this.fireDidChange();
	}

	setConfigOptions(configOptions: SessionConfigOption[]): void {
		const log = Logger.getInstance();
		log.debug(`setConfigOptions called with: ${configOptions?.length} options`);
		for (const opt of configOptions ?? []) {
			if (opt.category === "model" && opt.type === "select") {
				log.info(`[MODEL DATA] id=${opt.id}, type=${opt.type}, currentValue=${opt.currentValue}`);
				const flat = "group" in (opt.options[0] ?? {}) ? (opt.options as { options: unknown[] }[]).flatMap((g: { options: unknown[] }) => g.options) : opt.options;
				for (const o of (flat ?? []) as { name?: string; value?: string }[]) {
					log.info(`[MODEL DATA]   name="${o.name}", value="${o.value}"`);
				}
			}
		}
		this.update({ configOptions });
	}

	setConnectionError(error: string | null): void {
		this.update({ connectionError: error });
	}

	private static generateTitle(existingTitles: string[]): string {
		const now = new Date();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const base = `${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
		let title = base;
		let counter = 1;
		while (existingTitles.includes(title)) {
			title = `${base} (${counter})`;
			counter++;
		}
		return title;
	}

	addSession(session: Omit<SessionSummary, "title">): void {
		const existing = this._state.sessions.find((s) => s.id === session.id);
		if (existing) return;
		if (this._useAgentSessions) {
			this._state.sessions = [
				{ ...session, title: session.id },
				...this._state.sessions,
			];
			this.fireDidChange();
			return;
		}
		const existingTitles = Object.values(this._sessionMeta).map((m) => m.title);
		const title = StateManager.generateTitle(existingTitles);
		this._state.sessions = [
			{ ...session, title },
			...this._state.sessions,
		];
		this.fireDidChange();
	}

	markSessionPrompted(sessionId: string): void {
		this._promptedSessions.add(sessionId);
		this.storage.update(PROMPTED_SESSIONS_KEY, [...this._promptedSessions]);
	}

	isSessionPrompted(sessionId: string): boolean {
		return this._promptedSessions.has(sessionId);
	}

	getEmptySessionIds(): string[] {
		return this._state.sessions
			.filter((s) => !this._promptedSessions.has(s.id))
			.map((s) => s.id);
	}

	removeEmptySessions(): string[] {
		const emptyIds = this.getEmptySessionIds();
		for (const id of emptyIds) {
			this.removeSession(id);
		}
		return emptyIds;
	}

	isSessionPersisted(sessionId: string): boolean {
		if (this._useAgentSessions) return true;
		return !!this._sessionMeta[sessionId];
	}

	getUnpersistedSessionIds(): string[] {
		return this.getEmptySessionIds();
	}

	ensureSessionPersisted(sessionId: string): void {
		if (this._useAgentSessions) return;
		if (this._sessionMeta[sessionId]) return;
		const session = this._state.sessions.find((s) => s.id === sessionId);
		if (!session) return;
		this._sessionMeta[sessionId] = {
			title: session.title,
			createdAt: session.createdAt,
			agentId: session.agentId,
		};
		this.persist();
	}

	unpersistSession(sessionId: string): void {
		if (this._useAgentSessions) return;
		if (!this._sessionMeta[sessionId]) return;
		delete this._sessionMeta[sessionId];
		this.persist();
	}

	updateSessionTitle(sessionId: string, title: string): void {
		const session = this._state.sessions.find((s) => s.id === sessionId);
		if (!session || session.title === title) return;
		session.title = title;
		if (!this._useAgentSessions && this._sessionMeta[sessionId]) {
			this._sessionMeta[sessionId].title = title;
			this.persist();
		}
		this.fireDidChange();
	}

	private _useAgentSessions = false;

	setSessionsFromAgent(agentId: string, agentSessions: Array<{ sessionId: string; title?: string | null; updatedAt?: string | null }>): void {
		this._useAgentSessions = true;
		const deleted = new Set(this._deletedByAgent[agentId] ?? []);
		const activeSessionId = this._state.activeSession;
		const agentSessionIds = new Set(agentSessions.map((s) => s.sessionId));
		for (const sid of this._promptedSessions) {
			if (!agentSessionIds.has(sid) && sid !== activeSessionId) {
				this._promptedSessions.delete(sid);
			}
		}
		if (this._promptedSessions.size !== this.storage.get<string[]>(PROMPTED_SESSIONS_KEY)?.length) {
			this.storage.update(PROMPTED_SESSIONS_KEY, [...this._promptedSessions]);
		}
		const sessions: SessionSummary[] = agentSessions
			.filter((s) => !deleted.has(s.sessionId))
			.filter((s) => this._promptedSessions.has(s.sessionId) || s.sessionId === activeSessionId)
			.map((s) => ({
				id: s.sessionId,
				title: s.title ?? s.sessionId,
				agentId,
				createdAt: 0,
				updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : 0,
				messageCount: 0,
			}));
		Logger.getInstance().debug(`setSessionsFromAgent: setting ${sessions.length} sessions for agent=${agentId}, activeSession=${this._state.activeSession}`);
		console.log("[ACP-DEBUG] setSessionsFromAgent: " + sessions.length + " sessions for agent=" + agentId + " activeSession=" + this._state.activeSession);
		for (const s of sessions) {
			console.log("[ACP-DEBUG]   session: id=" + s.id + " title=" + s.title + " updatedAt=" + s.updatedAt);
		}
		this._state.sessions = sessions;
		this.fireDidChange();
	}

	clearAgentSessions(): void {
		if (!this._useAgentSessions) return;
		this._useAgentSessions = false;
		this._state.sessions = this.buildSessionsFromMeta();
		this.fireDidChange();
	}

	get useAgentSessions(): boolean {
		return this._useAgentSessions;
	}

	removeSession(sessionId: string): void {
		this._promptedSessions.delete(sessionId);
		this.storage.update(PROMPTED_SESSIONS_KEY, [...this._promptedSessions]);
		if (this._useAgentSessions) {
			const agentId = this._state.activeAgent;
			if (agentId) {
				const list = this._deletedByAgent[agentId] ?? [];
				if (!list.includes(sessionId)) {
					list.push(sessionId);
				}
				this._deletedByAgent[agentId] = list;
				this.storage.update(DELETED_SESSIONS_KEY, this._deletedByAgent);
			}
			this._state.sessions = this._state.sessions.filter((s) => s.id !== sessionId);
			if (this._state.activeSession === sessionId) {
				this._state.activeSession = null;
			}
			this.fireDidChange();
			return;
		}
		delete this._sessionMeta[sessionId];
		this._state.sessions = this._state.sessions.filter((s) => s.id !== sessionId);
		const activeSession = this._state.activeSession === sessionId ? null : this._state.activeSession;
		this.update({ activeSession });
	}

	private persist(): void {
		this.storage.update(STORAGE_KEY, {
			activeAgent: this._state.activeAgent,
			activeSession: this._state.activeSession,
			agents: this._state.agents,
			configOptions: this._state.configOptions,
			connectionError: this._state.connectionError,
		});
		this.storage.update(SESSION_META_KEY, this._sessionMeta);
	}

	dispose(): void {
		this._onDidChange.dispose();
	}
}
