import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "../../src/webview/components/MessageList";
import { useStore } from "../../src/webview/store";
import type { Message } from "@shared/types/extension";

function makeMessage(id: string, role: "user" | "assistant", content: string, chunks?: Message["chunks"]): Message {
	return { id, sessionId: "ses_1", role, content, timestamp: Date.now(), chunks };
}

describe("MessageList", () => {
	beforeEach(() => {
		useStore.setState({
			activeSession: "ses_1",
			messages: new Map(),
			isStreaming: false,
		});
	});

	it("shows 'No messages yet' when empty", () => {
		render(<MessageList />);
		expect(screen.getByText("No messages yet")).toBeInTheDocument();
	});

	it("displays user and assistant messages in order", () => {
		const messages = [
			makeMessage("msg_1", "user", "Hello"),
			makeMessage("msg_2", "assistant", "Hi there"),
		];
		useStore.setState({ messages: new Map([["ses_1", messages]]) });
		render(<MessageList />);
		const items = screen.getAllByRole("generic").filter((el) => el.className.includes("acp-message-item--"));
		expect(items.length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText("Hello")).toBeInTheDocument();
		expect(screen.getByText("Hi there")).toBeInTheDocument();
	});

	it("shows streaming cursor on last assistant message when isStreaming", () => {
		const messages = [
			makeMessage("msg_1", "user", "Hello"),
			makeMessage("msg_2", "assistant", "Loading..."),
		];
		useStore.setState({
			messages: new Map([["ses_1", messages]]),
			isStreaming: true,
		});
		render(<MessageList />);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("shows assistant message with chunks after stream_end", () => {
		const messages = [
			makeMessage("msg_1", "user", "Hello"),
			makeMessage("msg_2", "assistant", "Response", [
				{ type: "text", content: "Response", timestamp: Date.now() },
			]),
		];
		useStore.setState({
			messages: new Map([["ses_1", messages]]),
			isStreaming: false,
		});
		render(<MessageList />);
		expect(screen.getByText("Response")).toBeInTheDocument();
		expect(screen.queryByText("No messages yet")).not.toBeInTheDocument();
	});

	it("hides 'No messages yet' when messages exist", () => {
		useStore.setState({ messages: new Map([["ses_1", [makeMessage("msg_1", "user", "Hi")]]]) });
		render(<MessageList />);
		expect(screen.queryByText("No messages yet")).not.toBeInTheDocument();
	});

	it("shows thought and text content in assistant message", () => {
		const messages = [
			makeMessage("msg_1", "user", "Hello"),
			makeMessage("msg_2", "assistant", "Answer", [
				{ type: "thought", content: "Thinking...", timestamp: Date.now() },
				{ type: "text", content: "Answer", timestamp: Date.now() },
			]),
		];
		useStore.setState({
			messages: new Map([["ses_1", messages]]),
		});
		render(<MessageList />);
		expect(screen.getByText("Answer")).toBeInTheDocument();
	});
});
