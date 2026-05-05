import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PromptInput } from "../../src/webview/components/PromptInput";
import { useStore } from "../../src/webview/store";
import * as vscodeApi from "../../src/webview/api/vscode";

vi.mock("../../src/webview/api/vscode", () => ({
	postMessage: vi.fn(),
	onMessage: () => () => {},
	getVsCodeState: vi.fn(() => undefined),
	setVsCodeState: vi.fn(),
}));

describe("PromptInput", () => {
	beforeEach(() => {
		useStore.setState({
			activeAgent: "opencode",
			activeSession: "ses_1",
			inputText: "",
			isStreaming: false,
			isCommandMenuOpen: false,
			connectionError: null,
			reconnectFailed: false,
			slashCommands: [],
			messages: new Map(),
			escCancelTimer: null,
			queuedPrompts: [],
		});
		vi.clearAllMocks();
	});

	it("renders textarea with placeholder when session active", () => {
		render(<PromptInput />);
		expect(screen.getByPlaceholderText("Type a message... (/ for commands, @ for roles & files)")).toBeInTheDocument();
	});

	it("renders enabled textarea when no session but agent connected", () => {
		useStore.setState({ activeSession: null });
		render(<PromptInput />);
		expect(screen.getByPlaceholderText("Type a message... (/ for commands, @ for roles & files)")).not.toBeDisabled();
	});

	it("renders disabled textarea with agent placeholder when no agent", () => {
		useStore.setState({ activeAgent: null, activeSession: null });
		render(<PromptInput />);
		expect(screen.getByPlaceholderText("Connect to an agent first")).toBeDisabled();
	});

	it("opens command menu when typing /", () => {
		render(<PromptInput />);
		const textarea = screen.getByPlaceholderText("Type a message... (/ for commands, @ for roles & files)");
		fireEvent.change(textarea, { target: { value: "/" } });
		expect(useStore.getState().isCommandMenuOpen).toBe(true);
	});

	it("closes command menu when typing non-slash input", () => {
		useStore.setState({ isCommandMenuOpen: true });
		render(<PromptInput />);
		const textarea = screen.getByPlaceholderText("Type a message... (/ for commands, @ for roles & files)");
		fireEvent.change(textarea, { target: { value: "hello" } });
		expect(useStore.getState().isCommandMenuOpen).toBe(false);
	});

	it("shows default commands in menu when no agent commands", () => {
		useStore.setState({ inputText: "/", isCommandMenuOpen: true, slashCommands: [] });
		render(<PromptInput />);
		expect(screen.getByText("/help")).toBeInTheDocument();
		expect(screen.getByText("/sessions")).toBeInTheDocument();
		expect(screen.getByText("/models")).toBeInTheDocument();
		expect(screen.getByText("/think")).toBeInTheDocument();
	});

	it("shows agent commands merged with default commands", () => {
		useStore.setState({
			inputText: "/",
			isCommandMenuOpen: true,
			slashCommands: [{ name: "/init", description: "Initialize project" }],
		});
		render(<PromptInput />);
		expect(screen.getByText("/help")).toBeInTheDocument();
		expect(screen.getByText("/init")).toBeInTheDocument();
	});

	it("sends slash command via postMessage", () => {
		render(<PromptInput />);
		const textarea = screen.getByPlaceholderText("Type a message... (/ for commands, @ for roles & files)");
		fireEvent.change(textarea, { target: { value: "/init" } });
		fireEvent.keyDown(textarea, { key: "Enter" });
		expect(vscodeApi.postMessage).toHaveBeenCalledWith({ type: "slash_command", command: "init", args: "" });
	});

	it("sends normal message and adds user message optimistically", () => {
		render(<PromptInput />);
		const textarea = screen.getByPlaceholderText("Type a message... (/ for commands, @ for roles & files)");
		fireEvent.change(textarea, { target: { value: "Hello" } });
		fireEvent.keyDown(textarea, { key: "Enter" });
		expect(vscodeApi.postMessage).toHaveBeenCalledWith({ type: "send_prompt", sessionId: "ses_1", prompt: "Hello" });
		const messages = useStore.getState().messages.get("ses_1") ?? [];
		expect(messages.some((m) => m.role === "user" && m.content === "Hello")).toBe(true);
	});

	it("shows connection error when present", () => {
		useStore.setState({ connectionError: "Agent disconnected" });
		render(<PromptInput />);
		expect(screen.getByText("Agent disconnected")).toBeInTheDocument();
	});

	it("opens sessions popup instead of sending /sessions command", () => {
		useStore.setState({ inputText: "/sessions" });
		render(<PromptInput />);
		const textarea = screen.getByPlaceholderText("Type a message... (/ for commands, @ for roles & files)");
		fireEvent.keyDown(textarea, { key: "Enter" });
		expect(vscodeApi.postMessage).not.toHaveBeenCalled();
		expect(useStore.getState().commandPopup).toBe("sessions");
		expect(useStore.getState().inputText).toBe("");
	});

	it("opens models popup instead of sending /models command", () => {
		useStore.setState({ inputText: "/models" });
		render(<PromptInput />);
		const textarea = screen.getByPlaceholderText("Type a message... (/ for commands, @ for roles & files)");
		fireEvent.keyDown(textarea, { key: "Enter" });
		expect(vscodeApi.postMessage).not.toHaveBeenCalled();
		expect(useStore.getState().commandPopup).toBe("models");
		expect(useStore.getState().inputText).toBe("");
	});

	it("shows reconnect button when reconnectFailed", () => {
		useStore.setState({ connectionError: "lost", reconnectFailed: true });
		render(<PromptInput />);
		expect(screen.getByText("Reconnect")).toBeInTheDocument();
	});
});
