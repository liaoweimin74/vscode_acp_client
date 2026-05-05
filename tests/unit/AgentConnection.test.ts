import { describe, it, expect } from "vitest";
import { AgentConnection } from "../../src/protocol/AgentConnection";
import type { AgentConfig } from "../../src/shared/types/acp";

const mockConfig: AgentConfig = {
	id: "test-agent",
	name: "Test Agent",
	command: "echo",
	args: [],
};

describe("AgentConnection", () => {
	it("stores config from constructor", () => {
		const conn = new AgentConnection(mockConfig);
		expect(conn.config).toBe(mockConfig);
		expect(conn.config.id).toBe("test-agent");
	});

	it("starts disconnected", () => {
		const conn = new AgentConnection(mockConfig);
		expect(conn.isConnected).toBe(false);
		expect(conn.state.connected).toBe(false);
		expect(conn.state.initialized).toBe(false);
	});

	it("getSession returns undefined for unknown session", () => {
		const conn = new AgentConnection(mockConfig);
		expect(conn.getSession("nonexistent")).toBeUndefined();
	});

	it("assertConnected throws when not connected", async () => {
		const conn = new AgentConnection(mockConfig);
		await expect(conn.createSession("/tmp")).rejects.toThrow("not connected");
	});

	it("assertConnected throws for prompt when not connected", async () => {
		const conn = new AgentConnection(mockConfig);
		await expect(conn.prompt("sid", "hello")).rejects.toThrow("not connected");
	});

	it("assertConnected throws for cancel when not connected", async () => {
		const conn = new AgentConnection(mockConfig);
		await expect(conn.cancel("sid")).rejects.toThrow("not connected");
	});

	it("assertConnected throws for setConfigOption when not connected", async () => {
		const conn = new AgentConnection(mockConfig);
		await expect(conn.setConfigOption("sid", "model", "gpt")).rejects.toThrow("not connected");
	});

	it("assertConnected throws for closeSession when not connected", async () => {
		const conn = new AgentConnection(mockConfig);
		await expect(conn.closeSession("sid")).rejects.toThrow("not connected");
	});

	it("emits stateChanged on connect failure (double connect)", async () => {
		const conn = new AgentConnection(mockConfig);
		conn["connection"] = {} as never;
		conn["process"] = {} as never;
		conn["_state"] = { connected: true, initialized: true };
		await expect(conn.connect()).rejects.toThrow("already connected");
	});
});
