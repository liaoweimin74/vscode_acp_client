import { ChildProcess, spawn } from "node:child_process";
import type { Client, InitializeResponse } from "@agentclientprotocol/sdk";
import { ClientSideConnection, ndJsonStream } from "@agentclientprotocol/sdk";
import type { AgentConfig, AgentConnectionState, Session } from "../shared/types/acp.js";
import type { FileAttachment } from "../shared/types/extension.js";
import { EventEmitter } from "../shared/EventEmitter.js";
import { Logger } from "../extension/Logger.js";

interface AgentConnectionEvents {
	stateChanged: AgentConnectionState;
	sessionCreated: Session;
	sessionClosed: string;
	sessionUpdate: { sessionId: string; update: unknown };
	configChanged: { sessionId: string; options: unknown[] };
	error: Error;
	reconnecting: { attempt: number };
	reconnectFailed: void;
}

export class AgentConnection extends EventEmitter<AgentConnectionEvents> {
	readonly config: AgentConfig;
	private process: ChildProcess | null = null;
	private connection: ClientSideConnection | null = null;
	private _state: AgentConnectionState = { connected: false, initialized: false };
	private sessions = new Map<string, Session>();
	private _disconnecting = false;
	private _connectionId = 0;
	private _initExited: { code: number | null; signal: string | null } | null = null;
	private _reconnecting = false;
	private _reconnectAttempts = 0;
	private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private _pendingSessionId: string | null = null;
	private log = Logger.getInstance();

	get state(): AgentConnectionState {
		return this._state;
	}

	get isConnected(): boolean {
		return this._state.connected && this._state.initialized;
	}

	get supportsLoadSession(): boolean {
		return this._state.agentInfo?.agentCapabilities?.loadSession ?? false;
	}

	getSession(sessionId: string): Session | undefined {
		return this.sessions.get(sessionId);
	}

	get pendingSessionId(): string | null {
		return this._pendingSessionId;
	}

	async closePendingSession(): Promise<void> {
		const id = this._pendingSessionId;
		if (!id) return;
		this._pendingSessionId = null;
		try {
			await this.closeSession(id);
		} catch {
			this.sessions.delete(id);
		}
	}

	constructor(config: AgentConfig) {
		super();
		this.config = config;
	}

	async connect(): Promise<InitializeResponse> {
		if (this.isConnected) {
			throw new Error(`Agent ${this.config.id} is already connected`);
		}

		this._disconnecting = false;
		this._initExited = null;
		this._connectionId++;
		const currentConnectionId = this._connectionId;
		this.log.info(`${this.config.id} connect() starting, connectionId=${currentConnectionId}`);
		this.process = spawn(this.config.command, this.config.args ?? [], {
			env: { ...process.env, ...this.config.env },
			stdio: ["pipe", "pipe", "pipe"],
			shell: true,
		});

		if (!this.process.stdin || !this.process.stdout) {
			throw new Error(`Failed to create stdio streams for agent ${this.config.id}`);
		}

		this.process.stderr?.on("data", (data: Buffer) => {
			this.log.error(`${this.config.id} stderr: ${data.toString()}`);
		});

		this.process.on("error", (err) => {
			this.log.error(`${this.config.id} process error: ${err}`);
			this.updateState({ connected: false, initialized: false });
			this.emit("error", err);
		});

		this.process.on("exit", (code, signal) => {
			this.log.error(`${this.config.id} process exited with code ${code}, signal ${signal}`);
			if (this._connectionId !== currentConnectionId) return;
			this._initExited = { code, signal };
			this.updateState({ connected: false, initialized: false });
			this.connection = null;
			if (!this._disconnecting && code !== 0) {
				this.emit("error", new Error(`Agent process exited with code ${code}`));
				this.attemptReconnect();
			}
		});

		const output = this.process.stdin;
		const input = this.process.stdout;
		const stream = ndJsonStream(
			new WritableStream({
				write(chunk) {
					output.write(chunk);
				},
			}),
			new ReadableStream({
				start(controller) {
					input.on("data", (data: Buffer) => {
						controller.enqueue(new Uint8Array(data));
					});
					input.on("end", () => {
						controller.close();
					});
				},
			}),
		);

		const clientImpl: Client = {
			sessionUpdate: async (params) => {
				const update = params.update;
				if (update.sessionUpdate === "config_option_update") {
					this.emit("configChanged", {
						sessionId: params.sessionId,
						options: update.configOptions,
					});
				}
				this.emit("sessionUpdate", {
					sessionId: params.sessionId,
					update,
				});
			},
			requestPermission: async (params) => ({
				outcome: {
					outcome: "selected" as const,
					optionId: params.options[0]?.optionId ?? "",
				},
			}),
		};

		this.connection = new ClientSideConnection(() => clientImpl, stream);

		this.connection.signal.addEventListener("abort", () => {
			if (this._connectionId !== currentConnectionId) return;
			this.updateState({ connected: false, initialized: false });
			this.connection = null;
			if (!this._disconnecting) {
				this.emit("error", new Error(`Connection to agent ${this.config.id} closed`));
			}
		});

		this.updateState({ connected: true, initialized: false });

		try {
			const initResponse = await this.connection.initialize({
				protocolVersion: 1,
				clientCapabilities: {
					fs: { readTextFile: true, writeTextFile: true },
				},
				clientInfo: {
					name: "vscode-acp",
					version: "0.1.0",
				},
			});

			this.log.info(`initResponse capabilities: ${JSON.stringify(initResponse.agentCapabilities)}`);
			this.updateState({
				connected: true,
				initialized: true,
				agentInfo: initResponse,
			});

			return initResponse;
		} catch (err) {
			this.disconnect();
			if (this._initExited) {
				const { code, signal } = this._initExited;
				const reason = signal
					? `killed by signal ${signal}`
					: code !== null ? `exited with code ${code}` : "exited unexpectedly";
				throw new Error(
					`Agent "${this.config.command}" ${reason}. Check that the command is correct and the agent is installed.`,
				);
			}
			throw err;
		}
	}

	async createSession(cwd: string): Promise<Session> {
		this.assertConnected();

		const response = await this.connection!.newSession({
			cwd,
			mcpServers: [],
		});

		this.log.debug("newSession response received");

		const session: Session = {
			id: response.sessionId,
			agentId: this.config.id,
			cwd,
			configOptions: response.configOptions ?? [],
			modes: response.modes ?? undefined,
			models: response.models ?? undefined,
			status: "idle",
		};

		this.log.debug(`created session: ${session.id}, configOptions: ${session.configOptions?.length}, models: ${session.models}, modes: ${JSON.stringify(session.modes)}`);
		this.log.debug(`raw newSession response modes: ${JSON.stringify(response.modes)}`);

		this.sessions.set(session.id, session);
		this.emit("sessionCreated", session);
		return session;
	}

	async listSessions(cwd?: string) {
		this.assertConnected();

		const capabilities = this._state.agentInfo?.agentCapabilities?.sessionCapabilities;
		if (!capabilities?.list) {
			console.log("[ACP-DEBUG] listSessions: sessionCapabilities.list not supported, returning []");
			return [];
		}

		const response = await this.connection!.listSessions({
			cwd,
		});

		console.log("[ACP-DEBUG] listSessions: returned " + response.sessions.length + " sessions");
		for (const s of response.sessions) {
			console.log("[ACP-DEBUG]   session: id=" + s.sessionId + " title=" + s.title + " cwd=" + s.cwd + " updatedAt=" + s.updatedAt);
		}
		return response.sessions;
	}

	async resumeSession(sessionId: string, cwd: string) {
		this.assertConnected();

		const response = await this.connection!.resumeSession({
			sessionId,
			cwd,
		});

		let session = this.sessions.get(sessionId);
		if (!session) {
			session = {
				id: sessionId,
				agentId: this.config.id,
				cwd,
				configOptions: response.configOptions ?? [],
				modes: response.modes ?? undefined,
				models: response.models ?? undefined,
				status: "idle",
			};
			this.sessions.set(sessionId, session);
		} else {
			session.status = "idle";
			session.configOptions = response.configOptions ?? session.configOptions;
			session.modes = response.modes ?? session.modes;
			session.models = response.models ?? session.models;
		}

		return response;
	}

	async loadSession(sessionId: string, cwd: string) {
		this.assertConnected();

		const response = await this.connection!.loadSession({
			sessionId,
			cwd,
			mcpServers: [],
		});

		console.log("[ACP-DEBUG] loadSession: sessionId=" + sessionId + " configOptions=" + (response.configOptions?.length ?? 0) + " modes=" + (response.modes?.availableModes?.length ?? 0) + " models=" + (response.models?.availableModels?.length ?? 0));

		const session: Session = {
			id: sessionId,
			agentId: this.config.id,
			cwd,
			configOptions: response.configOptions ?? [],
			modes: response.modes ?? undefined,
			models: response.models ?? undefined,
			status: "idle",
		};

		this.sessions.set(session.id, session);
		return session;
	}

	async closeSession(sessionId: string) {
		this.assertConnected();

		await this.connection!.closeSession({ sessionId });
		this.sessions.delete(sessionId);
		this.emit("sessionClosed", sessionId);
	}

	async prompt(sessionId: string, message: string, attachments?: FileAttachment[]) {
		this.assertConnected();

		const session = this.sessions.get(sessionId);
		if (session) {
			session.status = "active";
		}

		const contentBlocks: Array<Record<string, unknown>> = [
			{ type: "text", text: message },
		];

		if (attachments && attachments.length > 0) {
			const promptCapabilities = this._state.agentInfo?.agentCapabilities?.promptCapabilities;
			const supportsEmbeddedContext = promptCapabilities?.embeddedContext ?? false;

			for (const att of attachments) {
				if ("fullText" in att) {
					contentBlocks.push({
						type: "text",
						text: att.fullText,
					});
					continue;
				}
				const uri = `file://${att.path.replace(/\\/g, "/")}`;
				if (supportsEmbeddedContext && !att.isDirectory) {
					try {
						const fs = await import("node:fs/promises");
						const stat = await fs.stat(att.path);
						if (stat.size <= 1_000_000) {
							const content = await fs.readFile(att.path, "utf-8");
							contentBlocks.push({
								type: "resource",
								resource: {
									uri,
									name: att.name,
									mimeType: "text/plain",
									text: content,
								},
							});
							continue;
						}
					} catch {
						// Fall through to ResourceLink
					}
				}
				contentBlocks.push({
					type: "resource_link",
					uri,
					name: att.name,
				});
			}
		}

		try {
			const promptParams = {
				sessionId,
				prompt: contentBlocks,
			};
			this.log.debug(`prompt() sending: ${JSON.stringify(promptParams)}`);
			const response = await this.connection!.prompt(promptParams);
			this.log.debug("prompt() response received");

			if (session) {
				session.status = "idle";
			}

			return response;
		} catch (err) {
			this.log.error(`prompt() error: ${err}`);
			if (session) {
				session.status = "idle";
			}
			throw err;
		}
	}

	async cancel(sessionId: string) {
		this.assertConnected();

		await this.connection!.cancel({ sessionId });
	}

	async setConfigOption(sessionId: string, configId: string, value: string | boolean) {
		this.assertConnected();

		const request =
			typeof value === "boolean"
				? { sessionId, configId, type: "boolean" as const, value }
				: { sessionId, configId, value };

		this.log.debug(`setConfigOption() sending: ${JSON.stringify(request)}`);
		try {
			const response = await this.connection!.setSessionConfigOption(request);
			this.log.debug(`setConfigOption() response: ${JSON.stringify(response)}`);

			const session = this.sessions.get(sessionId);
			if (session) {
				session.configOptions = response.configOptions;
			}

			this.emit("configChanged", { sessionId, options: response.configOptions ?? [] });

			return response;
		} catch (err) {
			this.log.error(`setConfigOption() error: ${err}`);
			throw err;
		}
	}

	async setSessionMode(sessionId: string, modeId: string) {
		this.assertConnected();

		await this.connection!.setSessionMode({
			sessionId,
			modeId,
		});
	}

	async disconnect() {
		this._disconnecting = true;
		this.cancelReconnect();
		await this.closePendingSession().catch(() => {});
		if (this.process) {
			this.process.kill();
			this.process = null;
		}
		this.connection = null;
		this.sessions.clear();
		this.updateState({ connected: false, initialized: false });
	}

	private async attemptReconnect(): Promise<void> {
		const maxRetries = 3;
		if (this._reconnectAttempts >= maxRetries) {
			this._reconnecting = false;
			this.emit("reconnectFailed", undefined);
			return;
		}

		this._reconnecting = true;
		this._reconnectAttempts++;
		const delay = Math.pow(2, this._reconnectAttempts - 1) * 1000;
		this.log.info(`Reconnecting attempt ${this._reconnectAttempts}/${maxRetries} in ${delay}ms`);
		this.emit("reconnecting", { attempt: this._reconnectAttempts });

		await new Promise<void>((resolve) => {
			this._reconnectTimer = setTimeout(resolve, delay);
		});

		if (this._disconnecting || this._reconnectAttempts > maxRetries) {
			this._reconnecting = false;
			return;
		}

		try {
			await this.connect();
			this._reconnecting = false;
			this._reconnectAttempts = 0;
			this.log.info("Reconnected successfully");
		} catch (err) {
			this.log.error(`Reconnect attempt ${this._reconnectAttempts} failed: ${err}`);
			this.attemptReconnect();
		}
	}

	private cancelReconnect(): void {
		if (this._reconnectTimer) {
			clearTimeout(this._reconnectTimer);
			this._reconnectTimer = null;
		}
		this._reconnecting = false;
		this._reconnectAttempts = 0;
	}

	private updateState(partial: Partial<AgentConnectionState>) {
		this._state = { ...this._state, ...partial };
		this.emit("stateChanged", this._state);
	}

	private assertConnected() {
		if (!this.connection || !this._state.initialized) {
			throw new Error(`Agent ${this.config.id} is not connected`);
		}
	}
}
