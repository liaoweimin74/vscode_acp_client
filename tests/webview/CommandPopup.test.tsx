import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPopup } from "../../src/webview/components/CommandPopup";
import { useStore } from "../../src/webview/store";
import type { SessionConfigOption, SessionSummary } from "@shared/types/extension";
import * as vscodeApi from "../../src/webview/api/vscode";

vi.mock("../../src/webview/api/vscode", () => ({
	postMessage: vi.fn(),
	onMessage: () => () => {},
	getVsCodeState: vi.fn(() => undefined),
	setVsCodeState: vi.fn(),
}));

const sessions: SessionSummary[] = [
	{ id: "ses_1", title: "Chat 1", messageCount: 5, createdAt: 1000, updatedAt: 3000 },
	{ id: "ses_2", title: "Chat 2", messageCount: 1, createdAt: 2000, updatedAt: 2000 },
	{ id: "ses_3", title: "", messageCount: 0, createdAt: 3000, updatedAt: 1000 },
];

const modelOption: SessionConfigOption = {
	id: "model",
	category: "model",
	type: "select",
	currentValue: "gpt-4",
	options: [
		{ name: "GPT-4", value: "gpt-4" },
		{ name: "Claude 3", value: "claude-3" },
	],
};

describe("CommandPopup", () => {
	beforeEach(() => {
		useStore.setState({
			activeSession: "ses_1",
			sessions,
			configOptions: [modelOption],
			commandPopup: null,
		});
		vi.clearAllMocks();
	});

	it("renders nothing when commandPopup is null", () => {
		const { container } = render(<CommandPopup />);
		expect(container.innerHTML).toBe("");
	});

	it("renders models popup when commandPopup is models", () => {
		useStore.setState({ commandPopup: "models" });
		render(<CommandPopup />);
		expect(document.querySelector(".acp-model-dropdown")).toBeInTheDocument();
	});

	it("closes models popup on backdrop click", () => {
		useStore.setState({ commandPopup: "models" });
		render(<CommandPopup />);
		fireEvent.click(document.querySelector(".acp-popup-backdrop")!);
		expect(useStore.getState().commandPopup).toBeNull();
	});

	it("closes models popup on Escape key", () => {
		useStore.setState({ commandPopup: "models" });
		render(<CommandPopup />);
		fireEvent.keyDown(document.querySelector(".acp-popup-backdrop")!, { key: "Escape" });
		expect(useStore.getState().commandPopup).toBeNull();
	});
});

describe("ModelsList", () => {
	beforeEach(() => {
		useStore.setState({
			activeSession: "ses_1",
			sessions,
			configOptions: [modelOption],
			commandPopup: "models",
		});
		vi.clearAllMocks();
	});

	it("lists model options", () => {
		render(<CommandPopup />);
		expect(screen.getAllByText("GPT-4").length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText("Claude 3").length).toBeGreaterThanOrEqual(1);
	});

	it("shows active class on current model", () => {
		render(<CommandPopup />);
		const activeItem = document.querySelector(".acp-model-selector__item.is-active");
		expect(activeItem).toBeInTheDocument();
		expect(activeItem?.textContent).toContain("GPT-4");
	});

	it("sends set_config and closes popup on model click", () => {
		render(<CommandPopup />);
		const claudeButtons = screen.getAllByText("Claude 3");
		const btn = claudeButtons.find((el) => el.closest("button")) ?? claudeButtons[0];
		fireEvent.click(btn);
		expect(vscodeApi.postMessage).toHaveBeenCalledWith({
			type: "set_config",
			sessionId: "ses_1",
			configId: "model",
			value: "claude-3",
		});
		expect(useStore.getState().commandPopup).toBeNull();
	});

	it("shows empty state when no model option", () => {
		useStore.setState({ configOptions: [] });
		render(<CommandPopup />);
		const items = screen.getAllByText("Model selection not available");
		expect(items.length).toBeGreaterThanOrEqual(1);
	});

	it("shows empty state when model option is not select type", () => {
		useStore.setState({
			configOptions: [{ id: "model", category: "model", type: "text", currentValue: "gpt-4" }],
		});
		render(<CommandPopup />);
		const items = screen.getAllByText("Model selection not available");
		expect(items.length).toBeGreaterThanOrEqual(1);
	});
});
