import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "../../src/shared/EventEmitter";

interface TestEvents {
	foo: string;
	bar: number;
}

describe("EventEmitter", () => {
	it("registers and fires event listeners", () => {
		const emitter = new EventEmitter<TestEvents>();
		const handler = vi.fn();
		emitter.on("foo", handler);
		emitter.emit("foo", "hello");
		expect(handler).toHaveBeenCalledWith("hello");
	});

	it("supports multiple listeners for same event", () => {
		const emitter = new EventEmitter<TestEvents>();
		const h1 = vi.fn();
		const h2 = vi.fn();
		emitter.on("foo", h1);
		emitter.on("foo", h2);
		emitter.emit("foo", "test");
		expect(h1).toHaveBeenCalledWith("test");
		expect(h2).toHaveBeenCalledWith("test");
	});

	it("on() returns unsubscribe function", () => {
		const emitter = new EventEmitter<TestEvents>();
		const handler = vi.fn();
		const unsub = emitter.on("foo", handler);
		unsub();
		emitter.emit("foo", "hello");
		expect(handler).not.toHaveBeenCalled();
	});

	it("off() removes specific listener", () => {
		const emitter = new EventEmitter<TestEvents>();
		const handler = vi.fn();
		emitter.on("foo", handler);
		emitter.off("foo", handler);
		emitter.emit("foo", "hello");
		expect(handler).not.toHaveBeenCalled();
	});

	it("removeAllListeners() clears all events", () => {
		const emitter = new EventEmitter<TestEvents>();
		const h1 = vi.fn();
		const h2 = vi.fn();
		emitter.on("foo", h1);
		emitter.on("bar", h2);
		emitter.removeAllListeners();
		emitter.emit("foo", "a");
		emitter.emit("bar", 1);
		expect(h1).not.toHaveBeenCalled();
		expect(h2).not.toHaveBeenCalled();
	});

	it("removeAllListeners(event) clears specific event", () => {
		const emitter = new EventEmitter<TestEvents>();
		const h1 = vi.fn();
		const h2 = vi.fn();
		emitter.on("foo", h1);
		emitter.on("bar", h2);
		emitter.removeAllListeners("foo");
		emitter.emit("foo", "a");
		emitter.emit("bar", 1);
		expect(h1).not.toHaveBeenCalled();
		expect(h2).toHaveBeenCalledWith(1);
	});

	it("does nothing when emitting event with no listeners", () => {
		const emitter = new EventEmitter<TestEvents>();
		expect(() => emitter.emit("foo", "test")).not.toThrow();
	});

	it("cleans up empty listener sets on off()", () => {
		const emitter = new EventEmitter<TestEvents>();
		const handler = vi.fn();
		emitter.on("foo", handler);
		emitter.off("foo", handler);
		emitter.on("foo", handler);
		emitter.emit("foo", "re-added");
		expect(handler).toHaveBeenCalledWith("re-added");
	});
});
