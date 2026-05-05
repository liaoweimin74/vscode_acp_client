import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentRegistry } from "../../src/protocol/AgentRegistry";
import { AgentConnection } from "../../src/protocol/AgentConnection";
import type { AgentConfig } from "../../src/shared/types/acp";

const mockConfig: AgentConfig = {
	id: "test-agent",
	name: "Test Agent",
	command: "echo",
	args: [],
};

const mockConfig2: AgentConfig = {
	id: "test-agent-2",
	name: "Test Agent 2",
	command: "echo",
	args: [],
};

describe("AgentRegistry", () => {
	let registry: AgentRegistry;

	beforeEach(() => {
		registry = new AgentRegistry();
	});

	it("adds and retrieves connections", () => {
		const conn = new AgentConnection(mockConfig);
		registry.add(conn);
		expect(registry.get("test-agent")).toBe(conn);
		expect(registry.count).toBe(1);
	});

	it("getAll returns all connections", () => {
		const conn1 = new AgentConnection(mockConfig);
		const conn2 = new AgentConnection(mockConfig2);
		registry.add(conn1);
		registry.add(conn2);
		expect(registry.getAll()).toHaveLength(2);
	});

	it("has() checks existence", () => {
		expect(registry.has("test-agent")).toBe(false);
		const conn = new AgentConnection(mockConfig);
		registry.add(conn);
		expect(registry.has("test-agent")).toBe(true);
	});

	it("removes connections", () => {
		const conn = new AgentConnection(mockConfig);
		registry.add(conn);
		registry.remove("test-agent");
		expect(registry.has("test-agent")).toBe(false);
		expect(registry.count).toBe(0);
	});

	it("emits agentAdded event", () => {
		const handler = vi.fn();
		registry.on("agentAdded", handler);
		const conn = new AgentConnection(mockConfig);
		registry.add(conn);
		expect(handler).toHaveBeenCalledWith(conn);
	});

	it("emits agentRemoved event", () => {
		const handler = vi.fn();
		registry.on("agentRemoved", handler);
		const conn = new AgentConnection(mockConfig);
		registry.add(conn);
		registry.remove("test-agent");
		expect(handler).toHaveBeenCalledWith("test-agent");
	});

	it("emits agentUpdated event on update", () => {
		const handler = vi.fn();
		registry.on("agentUpdated", handler);
		const conn = new AgentConnection(mockConfig);
		registry.add(conn);
		const conn2 = new AgentConnection(mockConfig);
		registry.update("test-agent", conn2);
		expect(handler).toHaveBeenCalledWith(conn2);
	});

	it("fromConfigs creates registry from config array", () => {
		const reg = AgentRegistry.fromConfigs([mockConfig, mockConfig2]);
		expect(reg.count).toBe(2);
		expect(reg.has("test-agent")).toBe(true);
		expect(reg.has("test-agent-2")).toBe(true);
	});

	it("remove does nothing for non-existent id", () => {
		expect(() => registry.remove("nonexistent")).not.toThrow();
	});

	it("disconnectAll clears all", async () => {
		const conn = new AgentConnection(mockConfig);
		const disconnectSpy = vi.spyOn(conn, "disconnect").mockResolvedValue(undefined);
		registry.add(conn);
		await registry.disconnectAll();
		expect(disconnectSpy).toHaveBeenCalled();
		expect(registry.count).toBe(0);
	});
});
