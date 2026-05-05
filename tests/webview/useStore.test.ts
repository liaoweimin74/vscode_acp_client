import { describe, it, expect, beforeEach, vi } from "vitest";
import { create } from "zustand";
import type { Message } from "@shared/types/extension";

const { handlerRef, postMessageMock, getVsCodeStateMock, setVsCodeStateMock } = vi.hoisted(() => {
	const ref: { current: ((msg: any) => void) | null } = { current: null };
	let storedState: unknown = undefined;
	return {
		handlerRef: ref,
		postMessageMock: vi.fn(),
		getVsCodeStateMock: vi.fn(() => storedState),
		setVsCodeStateMock: vi.fn((state: unknown) => { storedState = state; }),
		_setStoredState(state: unknown) { storedState = state; },
		_getStoredState() { return storedState; },
	};
});

vi.mock("../../src/webview/api/vscode", () => ({
	postMessage: postMessageMock,
	onMessage: (handler: (msg: any) => void) => {
		handlerRef.current = handler;
		return () => { handlerRef.current = null; };
	},
	getVsCodeState: getVsCodeStateMock,
	setVsCodeState: setVsCodeStateMock,
}));

import { useStore } from "../../src/webview/store/useStore";
import * as vscodeApi from "../../src/webview/api/vscode";

function sendMessage(msg: any) {
	if (!handlerRef.current) throw new Error("No message handler registered");
	handlerRef.current(msg);
}

function restoreMessagesHelper(): Map<string, Message[]> {
	try {
		const data = getVsCodeStateMock() as { messages: [string, Message[]][] } | null | undefined;
		if (data?.messages && Array.isArray(data.messages)) {
			return new Map(data.messages);
		}
	} catch {}
	return new Map();
}

describe("useStore", () => {
	beforeEach(() => {
		useStore.setState({
			activeAgent: null,
			activeSession: null,
			agents: [],
			sessions: [],
			configOptions: [],
			connectionError: null,
			reconnectFailed: false,
			slashCommands: [],
			messages: new Map(),
			isStreaming: false,
			queuedPrompts: [],
			inputText: "",
			isCommandMenuOpen: false,
			escCancelTimer: null,
		});
		vi.clearAllMocks();
	});

	describe("state_update", () => {
		it("sets activeAgent, activeSession, agents, sessions", () => {
			sendMessage({
				type: "state_update",
				state: {
					activeAgent: "opencode",
					activeSession: "ses_1",
					agents: [{ id: "opencode", name: "OpenCode" }],
					sessions: [{ id: "ses_1", title: "Chat 1" }],
					configOptions: [],
				},
			});
			const state = useStore.getState();
			expect(state.activeAgent).toBe("opencode");
			expect(state.activeSession).toBe("ses_1");
			expect(state.agents).toHaveLength(1);
			expect(state.sessions).toHaveLength(1);
		});

		it("sets connectionError from state_update", () => {
			sendMessage({
				type: "state_update",
				state: {
					activeAgent: null,
					activeSession: null,
					agents: [],
					sessions: [],
					configOptions: [],
					connectionError: "disconnected",
				},
			});
			expect(useStore.getState().connectionError).toBe("disconnected");
		});
	});

	describe("session_messages", () => {
		it("stores messages by sessionId", () => {
			sendMessage({
				type: "session_messages",
				sessionId: "ses_1",
				messages: [
					{ id: "m1", sessionId: "ses_1", role: "user", content: "Hi", timestamp: 1000 },
				],
			});
			const msgs = useStore.getState().messages.get("ses_1");
			expect(msgs).toHaveLength(1);
			expect(msgs![0].content).toBe("Hi");
		});

		it("populates messages on session switch", () => {
			useStore.setState({ activeSession: "ses_1" });
			sendMessage({
				type: "session_messages",
				sessionId: "ses_1",
				messages: [
					{ id: "m1", sessionId: "ses_1", role: "user", content: "Hello", timestamp: 1000 },
				],
			});

			sendMessage({
				type: "state_update",
				state: {
					activeAgent: "opencode",
					activeSession: "ses_2",
					agents: [],
					sessions: [],
					configOptions: [],
				},
			});
			expect(useStore.getState().activeSession).toBe("ses_2");
			expect(useStore.getState().messages.get("ses_2")).toBeUndefined();

			sendMessage({
				type: "session_messages",
				sessionId: "ses_2",
				messages: [
					{ id: "m2", sessionId: "ses_2", role: "user", content: "Previous chat", timestamp: 2000 },
					{ id: "m3", sessionId: "ses_2", role: "assistant", content: "Reply", timestamp: 2001 },
				],
			});
			const msgs2 = useStore.getState().messages.get("ses_2");
			expect(msgs2).toHaveLength(2);
			expect(msgs2![0].content).toBe("Previous chat");
			expect(msgs2![1].content).toBe("Reply");

			const msgs1 = useStore.getState().messages.get("ses_1");
			expect(msgs1).toHaveLength(1);
			expect(msgs1![0].content).toBe("Hello");
		});
	});

	describe("stream_end", () => {
		it("clears isStreaming on stream_end", () => {
			useStore.setState({ activeSession: "ses_1", isStreaming: true });
			sendMessage({ type: "stream_end", sessionId: "ses_1" });
			expect(useStore.getState().isStreaming).toBe(false);
		});

		it("processes queued prompt on stream_end", () => {
			useStore.setState({ activeSession: "ses_1", isStreaming: true, queuedPrompts: ["next question"] });
			sendMessage({ type: "stream_end", sessionId: "ses_1" });
			expect(vscodeApi.postMessage).toHaveBeenCalledWith({
				type: "send_prompt",
				sessionId: "ses_1",
				prompt: "next question",
			});
			expect(useStore.getState().queuedPrompts).toEqual([]);
			expect(useStore.getState().isStreaming).toBe(true);
		});
	});

	describe("session_update", () => {
		it("handles available_commands_update", () => {
			sendMessage({
				type: "session_update",
				sessionId: "ses_1",
				update: {
					sessionUpdate: "available_commands_update",
					availableCommands: [
						{ name: "init", description: "Initialize project" },
						{ name: "test", description: "Run tests" },
					],
				},
			});
			const cmds = useStore.getState().slashCommands;
			expect(cmds).toEqual([
				{ name: "/init", description: "Initialize project" },
				{ name: "/test", description: "Run tests" },
			]);
		});

		it("handles config_option_update", () => {
			sendMessage({
				type: "session_update",
				sessionId: "ses_1",
				update: {
					sessionUpdate: "config_option_update",
					configOptions: [{ id: "model", category: "model", type: "select", currentValue: "gpt-4", options: [] }],
				},
			});
			expect(useStore.getState().configOptions).toHaveLength(1);
		});

		it("handles clear_conversation", () => {
			useStore.setState({
				activeSession: "ses_1",
				messages: new Map([["ses_1", [{ id: "m1", sessionId: "ses_1", role: "user", content: "Hello", timestamp: 1000 }]]]),
			});
			sendMessage({
				type: "session_update",
				sessionId: "ses_1",
				update: { sessionUpdate: "clear_conversation" },
			});
			expect(useStore.getState().messages.has("ses_1")).toBe(false);
		});
	});

	describe("sendMessage", () => {
		it("posts send_prompt and optimistically adds user message", () => {
			useStore.setState({ activeSession: "ses_1" });
			useStore.getState().sendMessage("Hello");
			expect(vscodeApi.postMessage).toHaveBeenCalledWith({
				type: "send_prompt",
				sessionId: "ses_1",
				prompt: "Hello",
			});
			expect(useStore.getState().isStreaming).toBe(true);
			const msgs = useStore.getState().messages.get("ses_1");
			expect(msgs).toHaveLength(1);
			expect(msgs![0].role).toBe("user");
			expect(msgs![0].content).toBe("Hello");
		});

		it("posts send_prompt with empty sessionId when no active session", () => {
			useStore.setState({ activeSession: null });
			useStore.getState().sendMessage("Hello");
			expect(vscodeApi.postMessage).toHaveBeenCalledWith({
				type: "send_prompt",
				sessionId: "",
				prompt: "Hello",
			});
			expect(useStore.getState().isStreaming).toBe(true);
		});

		it("queues prompt when streaming", () => {
			useStore.setState({ activeSession: "ses_1", isStreaming: true });
			useStore.getState().sendMessage("queued");
			expect(useStore.getState().queuedPrompts).toEqual(["queued"]);
			expect(vscodeApi.postMessage).not.toHaveBeenCalledWith(
				expect.objectContaining({ type: "send_prompt", prompt: "queued" }),
			);
		});
	});

	describe("setConfig", () => {
		it("posts set_config with sessionId", () => {
			useStore.setState({ activeSession: "ses_1" });
			useStore.getState().setConfig("model", "gpt-4");
			expect(vscodeApi.postMessage).toHaveBeenCalledWith({
				type: "set_config",
				sessionId: "ses_1",
				configId: "model",
				value: "gpt-4",
			});
		});

		it("does nothing when no active session", () => {
			useStore.setState({ activeSession: null });
			useStore.getState().setConfig("model", "gpt-4");
			expect(vscodeApi.postMessage).not.toHaveBeenCalled();
		});
	});

	describe("cancelPrompt", () => {
		it("clears streaming state but preserves queued prompts", () => {
			useStore.setState({
				activeSession: "ses_1",
				isStreaming: true,
				queuedPrompts: ["queued msg"],
			});
			useStore.getState().cancelPrompt();
			expect(useStore.getState().isStreaming).toBe(false);
			expect(useStore.getState().queuedPrompts).toEqual(["queued msg"]);
		});
	});

	describe("sendQueuedPromptNow", () => {
		it("cancels current session and sends specified queued prompt", () => {
			useStore.setState({
				activeSession: "ses_1",
				isStreaming: true,
				queuedPrompts: ["first", "second", "third"],
			});
			useStore.getState().sendQueuedPromptNow(1);
			expect(vscodeApi.postMessage).toHaveBeenCalledWith({
				type: "cancel_prompt",
				sessionId: "ses_1",
			});
			expect(vscodeApi.postMessage).toHaveBeenCalledWith({
				type: "send_prompt",
				sessionId: "ses_1",
				prompt: "second",
			});
			expect(useStore.getState().queuedPrompts).toEqual(["first", "third"]);
			expect(useStore.getState().isStreaming).toBe(true);
		});

		it("does nothing when index is out of bounds", () => {
			useStore.setState({
				activeSession: "ses_1",
				isStreaming: true,
				queuedPrompts: ["only"],
			});
			vscodeApi.postMessage.mockClear();
			useStore.getState().sendQueuedPromptNow(5);
			expect(vscodeApi.postMessage).not.toHaveBeenCalled();
		});
	});

	describe("message persistence", () => {
		it("persists messages when messages change via session_messages", () => {
			sendMessage({
				type: "session_messages",
				sessionId: "ses_1",
				messages: [{ id: "m1", sessionId: "ses_1", role: "user", content: "Hello", timestamp: 1000 }],
			});
			expect(setVsCodeStateMock).toHaveBeenCalled();
			const lastCall = setVsCodeStateMock.mock.calls[setVsCodeStateMock.mock.calls.length - 1];
			const persisted = lastCall[0] as { messages: [string, Message[]][] };
			expect(persisted.messages).toHaveLength(1);
			expect(persisted.messages[0][0]).toBe("ses_1");
			expect(persisted.messages[0][1][0].content).toBe("Hello");
		});

		it("restores messages from getVsCodeState on store creation", () => {
			const savedMessages: [string, Message[]][] = [
				["ses_restored", [{ id: "m1", sessionId: "ses_restored", role: "user", content: "Restored", timestamp: 1000 }]],
			];
			getVsCodeStateMock.mockReturnValue({ messages: savedMessages });
			const freshStore = create<ReturnType<typeof useStore.getState> extends infer S ? S : never>()(() => ({
				...useStore.getState(),
				messages: restoreMessagesHelper(),
			}));
			expect(freshStore.getState().messages.get("ses_restored")).toHaveLength(1);
		});

		it("handles clear_conversation by deleting session messages", () => {
			useStore.setState({
				activeSession: "ses_1",
				messages: new Map([["ses_1", [{ id: "m1", sessionId: "ses_1", role: "user", content: "Hello", timestamp: 1000 }]]]),
			});
			expect(useStore.getState().messages.get("ses_1")).toHaveLength(1);

			sendMessage({
				type: "session_update",
				sessionId: "ses_1",
				update: { sessionUpdate: "clear_conversation" },
			});
			expect(useStore.getState().messages.has("ses_1")).toBe(false);
		});

		it("does not persist when messages have not changed", () => {
			sendMessage({
				type: "session_messages",
				sessionId: "ses_1",
				messages: [{ id: "m1", sessionId: "ses_1", role: "user", content: "Hello", timestamp: 1000 }],
			});
			const callCount = setVsCodeStateMock.mock.calls.length;
			useStore.setState({ inputText: "typing" });
			expect(setVsCodeStateMock.mock.calls.length).toBe(callCount);
		});

		it("restores empty Map when getVsCodeState returns null", () => {
			getVsCodeStateMock.mockReturnValue(null);
			const msgs = restoreMessagesHelper();
			expect(msgs.size).toBe(0);
		});

		it("restores empty Map when getVsCodeState returns invalid data", () => {
			getVsCodeStateMock.mockReturnValue({ notMessages: true });
			const msgs = restoreMessagesHelper();
			expect(msgs.size).toBe(0);
		});
	});
});
