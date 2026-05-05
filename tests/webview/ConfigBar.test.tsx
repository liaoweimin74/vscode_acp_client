import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConfigBar } from "../../src/webview/components/ConfigBar";
import { useStore } from "../../src/webview/store";
import type { SessionConfigOption } from "@shared/types/extension";
import * as vscodeApi from "../../src/webview/api/vscode";

vi.mock("../../src/webview/api/vscode", () => ({
	postMessage: vi.fn(),
	onMessage: () => () => {},
	getVsCodeState: vi.fn(() => undefined),
	setVsCodeState: vi.fn(),
}));

const modelOption: SessionConfigOption = {
	id: "model",
	category: "model",
	type: "select",
	currentValue: "gpt-4",
	options: [
		{ name: "GPT-4", value: "gpt-4" },
		{ name: "Claude", value: "claude-3" },
	],
};

const thinkOption: SessionConfigOption = {
	id: "thought_level",
	category: "thought_level",
	type: "select",
	currentValue: "medium",
	options: [
		{ name: "Low", value: "low" },
		{ name: "Medium", value: "medium" },
		{ name: "High", value: "high" },
	],
};

describe("ConfigBar", () => {
	beforeEach(() => {
		useStore.setState({
			activeAgent: "agent_1",
			activeSession: "ses_1",
			configOptions: [modelOption, thinkOption],
		});
		vi.clearAllMocks();
	});

	it("renders nothing when no active agent", () => {
		useStore.setState({ activeAgent: null });
		const { container } = render(<ConfigBar />);
		expect(container.innerHTML).toBe("");
	});

	it("shows current model name", () => {
		render(<ConfigBar />);
		expect(screen.getByText("GPT-4")).toBeInTheDocument();
	});

	it("shows current think level name", () => {
		render(<ConfigBar />);
		expect(screen.getByText("Medium")).toBeInTheDocument();
	});

	it("opens model dropdown on click", () => {
		render(<ConfigBar />);
		const btns = screen.getAllByRole("button");
		const modelBtn = btns.find((b) => b.textContent?.includes("GPT-4"))!;
		fireEvent.click(modelBtn);
		expect(screen.getByText("Claude")).toBeInTheDocument();
	});

	it("sends set_config when selecting a model", () => {
		render(<ConfigBar />);
		const btns = screen.getAllByRole("button");
		const modelBtn = btns.find((b) => b.textContent?.includes("GPT-4"))!;
		fireEvent.click(modelBtn);
		const claudeBtn = screen.getByText("Claude");
		fireEvent.click(claudeBtn);
		expect(vscodeApi.postMessage).toHaveBeenCalledWith({
			type: "set_config",
			sessionId: "ses_1",
			configId: "model",
			value: "claude-3",
		});
	});

	it("updates UI after config_option_update", () => {
		render(<ConfigBar />);
		expect(screen.getByText("GPT-4")).toBeInTheDocument();
		act(() => {
			useStore.setState({
				configOptions: [{
					...modelOption,
					currentValue: "claude-3",
				}, thinkOption],
			});
		});
		expect(screen.getByText("Claude")).toBeInTheDocument();
	});
});
