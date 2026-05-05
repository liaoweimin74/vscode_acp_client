import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageItem } from "../../src/webview/components/MessageItem";
import type { Message } from "@shared/types/extension";

function makeMessage(overrides: Partial<Message> = {}): Message {
	return {
		id: "msg_1",
		sessionId: "ses_1",
		role: "assistant",
		content: "Hello",
		timestamp: Date.now(),
		...overrides,
	};
}

describe("MessageItem", () => {
	it("renders user message with 'You' label", () => {
		render(<MessageItem message={makeMessage({ role: "user", content: "Hi there" })} />);
		expect(screen.getByText("You")).toBeInTheDocument();
		expect(screen.getByText("Hi there")).toBeInTheDocument();
	});

	it("renders assistant message with 'Assistant' label", () => {
		render(<MessageItem message={makeMessage({ role: "assistant", content: "Hello!" })} />);
		expect(screen.getByText("Assistant")).toBeInTheDocument();
		expect(screen.getByText("Hello!")).toBeInTheDocument();
	});

	it("renders thought chunks concatenated without extra newlines", () => {
		const chunks = [
			{ type: "thought" as const, content: "Let me think\n", timestamp: Date.now() },
			{ type: "thought" as const, content: "about this\n", timestamp: Date.now() },
			{ type: "thought" as const, content: "carefully\n\n", timestamp: Date.now() },
		];
		render(<MessageItem message={makeMessage({ content: "The answer", chunks })} />);
		const details = screen.getByText("Thinking...").closest("details")!;
		const contentDiv = details.querySelector(".acp-message-item__thoughts-content")!;
		expect(contentDiv.textContent).toBe("Let me thinkabout thiscarefully");
	});

	it("renders thought chunks with trailing newlines stripped per chunk", () => {
		const chunks = [
			{ type: "thought" as const, content: "Step 1\n\n\n", timestamp: Date.now() },
			{ type: "thought" as const, content: "Step 2\n", timestamp: Date.now() },
		];
		render(<MessageItem message={makeMessage({ content: "Done", chunks })} />);
		const details = screen.getByText("Thinking...").closest("details")!;
		const contentDiv = details.querySelector(".acp-message-item__thoughts-content")!;
		expect(contentDiv.textContent).toBe("Step 1Step 2");
	});

	it("does not render thought section when no thought chunks", () => {
		const chunks = [{ type: "text" as const, content: "Hello", timestamp: Date.now() }];
		render(<MessageItem message={makeMessage({ content: "Hello", chunks })} />);
		expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
	});

	it("renders markdown content", () => {
		render(<MessageItem message={makeMessage({ content: "**bold** and *italic*" })} />);
		expect(screen.getByText("bold")).toBeInTheDocument();
		expect(screen.getByText("italic")).toBeInTheDocument();
	});

	it("shows streaming cursor when isStreaming is true", () => {
		const { container } = render(<MessageItem message={makeMessage()} isStreaming />);
		expect(container.querySelector(".acp-message-item__cursor")).toBeInTheDocument();
	});

	it("hides streaming cursor when isStreaming is false", () => {
		const { container } = render(<MessageItem message={makeMessage()} isStreaming={false} />);
		expect(container.querySelector(".acp-message-item__cursor")).not.toBeInTheDocument();
	});

	it("renders code blocks with language", () => {
		render(<MessageItem message={makeMessage({ content: "```js\nconsole.log('hi')\n```" })} />);
		expect(screen.getByText("js")).toBeInTheDocument();
	});
});
