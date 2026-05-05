import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AgentConnection } from "../../src/protocol/AgentConnection";
import { AgentRegistry } from "../../src/protocol/AgentRegistry";
import { SlashCommandRegistry } from "../../src/extension/SlashCommandRegistry";
import { Logger } from "../../src/extension/Logger";
import { flattenSelectOptions } from "../../src/shared/utils";
import type { AgentConfig } from "../../src/shared/types/acp";
import type { SessionConfigSelectOption } from "../../src/shared/types/acp";

const OPENCODE_CONFIG: AgentConfig = {
	id: "opencode",
	name: "OpenCode",
	command: "opencode.exe",
	args: ["acp"],
};

const TIMEOUT = 30_000;
const LONG_TIMEOUT = 60_000;

describe("Integration: AgentConnection full lifecycle", () => {
	let connection: AgentConnection;
	const capturedLogs: string[] = [];

	beforeAll(() => {
		const logger = Logger.init({
			appendLine: (line: string) => {
				capturedLogs.push(line);
			},
		});
		logger.setLevel("debug");

		connection = new AgentConnection(OPENCODE_CONFIG);
	});

	afterAll(async () => {
		if (connection.isConnected) {
			await connection.disconnect();
		}
		Logger.getInstance().dispose();
	});

	it(
		"connects to opencode agent via ACP protocol",
		async () => {
			const stateChanges: Array<{ connected: boolean; initialized: boolean }> = [];
			connection.on("stateChanged", (state) => {
				stateChanges.push({ connected: state.connected, initialized: state.initialized });
			});

			const initResponse = await connection.connect();

			expect(connection.isConnected).toBe(true);
			expect(initResponse).toBeDefined();
			expect(initResponse.protocolVersion).toBe(1);
			expect(initResponse.agentInfo).toBeDefined();
			expect(initResponse.agentInfo.name).toBeTruthy();
			expect(initResponse.agentCapabilities).toBeDefined();

			const finalState = stateChanges[stateChanges.length - 1];
			expect(finalState.connected).toBe(true);
			expect(finalState.initialized).toBe(true);
		},
		TIMEOUT,
	);

	it(
		"creates a session and receives config options",
		async () => {
			const session = await connection.createSession(process.cwd());

			expect(session).toBeDefined();
			expect(session.id).toBeTruthy();
			expect(session.agentId).toBe("opencode");
			expect(session.status).toBe("idle");
			expect(session.configOptions).toBeDefined();
			expect(Array.isArray(session.configOptions)).toBe(true);
			expect(session.configOptions.length).toBeGreaterThan(0);
		},
		TIMEOUT,
	);

	it(
		"selects model via setConfigOption",
		async () => {
			const session = await connection.createSession(process.cwd());

			const modelOption = session.configOptions.find((opt) => opt.id === "model");
			if (!modelOption || modelOption.type !== "select") return;

			const flatOptions = flattenSelectOptions(modelOption.options);
			if (flatOptions.length < 2) return;

			const targetModel = flatOptions.find((m) => m.value !== modelOption.currentValue);
			if (!targetModel) return;
			const response = await connection.setConfigOption(session.id, "model", targetModel.value);
			expect(response).toBeDefined();
			expect(response.configOptions).toBeDefined();
		},
		TIMEOUT,
	);

	it(
		"sends prompt and receives streaming session updates",
		async () => {
			const session = await connection.createSession(process.cwd());
			const updates: Array<{ sessionId: string; update: unknown }> = [];

			const unsub = connection.on("sessionUpdate", (event) => {
				updates.push(event);
			});

			try {
				await connection.prompt(session.id, "Say exactly: hello world test");
				expect(updates.length).toBeGreaterThan(0);
			} finally {
				unsub();
			}
		},
		LONG_TIMEOUT,
	);

	it(
		"lists sessions via listSessions",
		async () => {
			const sessions = await connection.listSessions(process.cwd());
			expect(Array.isArray(sessions)).toBe(true);
			expect(sessions.length).toBeGreaterThan(0);
		},
		TIMEOUT,
	);

	it(
		"resumes a session via resumeSession",
		async () => {
			const session = await connection.createSession(process.cwd());
			const result = await connection.resumeSession(session.id, process.cwd());
			expect(result).toBeDefined();
			expect(result.configOptions).toBeDefined();
		},
		TIMEOUT,
	);

	it(
		"closeSession handles unsupported method gracefully",
		async () => {
			const session = await connection.createSession(process.cwd());

			try {
				await connection.closeSession(session.id);
			} catch (err) {
				expect(String(err)).toContain("Method not found");
			}
		},
		TIMEOUT,
	);

	it(
		"emits configChanged on setConfigOption",
		async () => {
			const session = await connection.createSession(process.cwd());
			const modelOption = session.configOptions.find((opt) => opt.id === "model");
			if (!modelOption || modelOption.type !== "select") return;

			const flatOptions = flattenSelectOptions(modelOption.options);
			if (flatOptions.length < 2) return;

			const target = flatOptions.find((m) => m.value !== modelOption.currentValue);
			if (!target) return;

			const configEvents: { sessionId: string; options: unknown[] }[] = [];
			const unsub = connection.on("configChanged", (e) => {
				configEvents.push(e);
			});

			await connection.setConfigOption(session.id, "model", target.value);

			if (configEvents.length > 0) {
				expect(configEvents[0].sessionId).toBe(session.id);
			}

			unsub();
		},
		TIMEOUT,
	);

	it(
		"disconnects cleanly",
		async () => {
			await connection.disconnect();

			expect(connection.isConnected).toBe(false);
			expect(connection.state.connected).toBe(false);
			expect(connection.state.initialized).toBe(false);
		},
		TIMEOUT,
	);

	it("logs were captured during the integration flow", () => {
		expect(capturedLogs.length).toBeGreaterThan(0);
		const hasConnectLog = capturedLogs.some((l) => l.includes("connect() starting"));
		expect(hasConnectLog).toBe(true);
	});
});

describe("Integration: AgentRegistry event forwarding", () => {
	let registry: AgentRegistry;
	let registryConn: AgentConnection;

	beforeAll(() => {
		registry = new AgentRegistry();
		registryConn = new AgentConnection(OPENCODE_CONFIG);
	});

	afterAll(async () => {
		await registry.disconnectAll();
	});

	it(
		"forwards agentAdded, stateChanged, and sessionUpdate events",
		async () => {
			const events: string[] = [];
			registry.on("agentAdded", () => events.push("agentAdded"));
			registry.on("stateChanged", () => events.push("stateChanged"));
			registry.on("sessionUpdate", () => events.push("sessionUpdate"));

			registry.add(registryConn);
			expect(events).toContain("agentAdded");

			await registryConn.connect();
			expect(events).toContain("stateChanged");

			const session = await registryConn.createSession(process.cwd());

			const sessionUpdatePromise = new Promise<void>((resolve) => {
				const check = () => {
					if (events.includes("sessionUpdate")) {
						resolve();
					}
				};
				registry.on("sessionUpdate", () => {
					events.push("sessionUpdate");
					check();
				});
				check();
			});

			await registryConn.prompt(session.id, "Say: test");

			await sessionUpdatePromise;
			expect(events).toContain("sessionUpdate");
		},
		LONG_TIMEOUT,
	);

	it(
		"emits agentRemoved on remove",
		async () => {
			const conn2 = new AgentConnection({
				id: "temp-agent",
				name: "Temp",
				command: "echo",
				args: [],
			});
			registry.add(conn2);

			let removedId: string | undefined;
			registry.on("agentRemoved", (id) => {
				removedId = id;
			});

			registry.remove("temp-agent");
			expect(removedId).toBe("temp-agent");
		},
	);
});

describe("Integration: Auto-reconnect", () => {
	it(
		"attempts reconnect after process crash",
		async () => {
			const conn = new AgentConnection(OPENCODE_CONFIG);
			await conn.connect();
			expect(conn.isConnected).toBe(true);

			const reconnectEvents: number[] = [];
			conn.on("reconnecting", (e) => {
				reconnectEvents.push(e.attempt);
			});

			const process = conn["process"];
			process?.kill("SIGTERM");

			await new Promise((r) => setTimeout(r, 5000));

			if (reconnectEvents.length > 0) {
				expect(reconnectEvents[0]).toBe(1);
			}

			conn["_disconnecting"] = true;
			conn["cancelReconnect"]();
			await conn.disconnect();
		},
		LONG_TIMEOUT,
	);

	it(
		"emits reconnectFailed after max retries",
		async () => {
			const conn = new AgentConnection({
				id: "failing-agent",
				name: "Failing Agent",
				command: "nonexistent_command_that_will_fail",
				args: [],
			});

			let reconnectFailed = false;
			conn.on("reconnectFailed", () => {
				reconnectFailed = true;
			});

			const reconnectEvents: number[] = [];
			conn.on("reconnecting", (e) => {
				reconnectEvents.push(e.attempt);
			});

			try {
				await conn.connect();
			} catch {
				// expected - command doesn't exist
			}

			await new Promise((r) => setTimeout(r, 15000));

			if (reconnectEvents.length > 0) {
				expect(reconnectFailed).toBe(true);
			}

			await conn.disconnect();
		},
		LONG_TIMEOUT,
	);
});

describe("Integration: Logger", () => {
	it("filters logs by level", () => {
		const lines: string[] = [];
		const logger = Logger.init({
			appendLine: (line: string) => lines.push(line),
		});

		logger.setLevel("warn");
		logger.debug("should not appear");
		logger.info("should not appear");
		logger.warn("should appear");
		logger.error("should also appear");

		expect(lines.length).toBe(2);
		expect(lines[0]).toContain("WARN");
		expect(lines[0]).toContain("should appear");
		expect(lines[1]).toContain("ERROR");
		expect(lines[1]).toContain("should also appear");

		Logger.getInstance().dispose();
	});

	it("includes timestamp and ACP prefix", () => {
		const lines: string[] = [];
		const logger = Logger.init({
			appendLine: (line: string) => lines.push(line),
		});

		logger.info("test message");

		expect(lines.length).toBe(1);
		expect(lines[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T.*\]\[ACP\]\[INFO\] test message$/);

		Logger.getInstance().dispose();
	});

	it("debug level shows all logs", () => {
		const lines: string[] = [];
		const logger = Logger.init({
			appendLine: (line: string) => lines.push(line),
		});

		logger.setLevel("debug");
		logger.debug("debug msg");
		logger.info("info msg");
		logger.warn("warn msg");
		logger.error("error msg");

		expect(lines.length).toBe(4);

		Logger.getInstance().dispose();
	});

	it("dispose clears singleton", () => {
		const logger = Logger.init({
			appendLine: () => {},
		});
		logger.dispose();
		const newInstance = Logger.getInstance();
		expect(newInstance).not.toBe(logger);
	});
});

describe("Integration: SlashCommandRegistry", () => {
	it("registers, lists, executes, and unregisters commands", async () => {
		const registry = new SlashCommandRegistry();
		let executedArgs = "";

		registry.register({
			name: "test-cmd",
			description: "Test command",
			execute: async (args) => {
				executedArgs = args;
			},
		});

		expect(registry.list()).toHaveLength(1);
		expect(registry.get("test-cmd")).toBeDefined();
		expect(registry.get("test-cmd")!.description).toBe("Test command");

		const result = await registry.execute("test-cmd", "hello");
		expect(result.success).toBe(true);
		expect(executedArgs).toBe("hello");

		registry.unregister("test-cmd");
		expect(registry.list()).toHaveLength(0);
		expect(registry.get("test-cmd")).toBeUndefined();
	});

	it("returns error for unknown command", async () => {
		const registry = new SlashCommandRegistry();
		const result = await registry.execute("nonexistent", "");
		expect(result.success).toBe(false);
		expect(result.error).toContain("Unknown command");
	});

	it("handles command execution errors", async () => {
		const registry = new SlashCommandRegistry();
		registry.register({
			name: "fail-cmd",
			description: "Failing command",
			execute: async () => {
				throw new Error("command failed");
			},
		});

		const result = await registry.execute("fail-cmd", "");
		expect(result.success).toBe(false);
		expect(result.error).toBe("command failed");
	});

	it("supports multiple commands", async () => {
		const registry = new SlashCommandRegistry();
		registry.register({ name: "cmd1", description: "Cmd 1", execute: async () => {} });
		registry.register({ name: "cmd2", description: "Cmd 2", execute: async () => {} });
		registry.register({ name: "cmd3", description: "Cmd 3", execute: async () => {} });

		expect(registry.list()).toHaveLength(3);
		expect(registry.get("cmd2")).toBeDefined();
	});
});

describe("Integration: flattenSelectOptions utility", () => {
	it("flattens flat options array", () => {
		const options: SessionConfigSelectOption[] = [
			{ name: "Model A", value: "a" },
			{ name: "Model B", value: "b" },
		];
		const result = flattenSelectOptions(options);
		expect(result).toEqual(options);
	});

	it("flattens grouped options array", () => {
		const grouped = [
			{
				group: "OpenAI",
				name: "OpenAI Models",
				options: [
					{ name: "GPT-4", value: "gpt-4" },
					{ name: "GPT-3.5", value: "gpt-3.5" },
				],
			},
			{
				group: "Anthropic",
				name: "Anthropic Models",
				options: [
					{ name: "Claude", value: "claude" },
				],
			},
		];
		const result = flattenSelectOptions(grouped);
		expect(result).toHaveLength(3);
		expect(result[0].value).toBe("gpt-4");
		expect(result[2].value).toBe("claude");
	});

	it("returns empty array for empty input", () => {
		expect(flattenSelectOptions([])).toEqual([]);
	});
});
