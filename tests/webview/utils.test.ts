import { describe, it, expect } from "vitest";
import { flattenSelectOptions, groupModelsByFamily, getModelLevel } from "@shared/utils";
import type { SessionConfigSelectOption } from "@shared/types/acp";

describe("flattenSelectOptions", () => {
	it("returns empty array for empty input", () => {
		expect(flattenSelectOptions([])).toEqual([]);
	});

	it("passes through flat options", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "Model A", value: "a" },
			{ name: "Model B", value: "b" },
		];
		expect(flattenSelectOptions(opts)).toEqual(opts);
	});

	it("flattens grouped options", () => {
		const grouped = [
			{ group: "g1", name: "Group 1", options: [{ name: "A", value: "a" }] },
			{ group: "g2", name: "Group 2", options: [{ name: "B", value: "b" }] },
		];
		expect(flattenSelectOptions(grouped as any)).toEqual([
			{ name: "A", value: "a" },
			{ name: "B", value: "b" },
		]);
	});
});

describe("getModelLevel", () => {
	it("extracts level from parenthesized suffix", () => {
		expect(getModelLevel("deepseek(low)")).toBe("low");
		expect(getModelLevel("deepseek(high)")).toBe("high");
		expect(getModelLevel("deepseek(max)")).toBe("max");
	});

	it("extracts case-insensitively", () => {
		expect(getModelLevel("Model(Low)")).toBe("low");
		expect(getModelLevel("Model(HIGH)")).toBe("high");
	});

	it("returns null for no level", () => {
		expect(getModelLevel("claude-sonnet-4")).toBeNull();
		expect(getModelLevel("gpt-4o")).toBeNull();
	});

	it("extracts pro/ultra/mini/lite/medium levels", () => {
		expect(getModelLevel("model(pro)")).toBe("pro");
		expect(getModelLevel("model(ultra)")).toBe("ultra");
		expect(getModelLevel("model(mini)")).toBe("mini");
		expect(getModelLevel("model(lite)")).toBe("lite");
		expect(getModelLevel("model(medium)")).toBe("medium");
	});
});

describe("groupModelsByFamily", () => {
	it("groups models with level suffixes", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "deepseek(low)", value: "ds-low" },
			{ name: "deepseek(high)", value: "ds-high" },
			{ name: "deepseek(max)", value: "ds-max" },
		];
		const groups = groupModelsByFamily(opts);
		expect(groups).toHaveLength(1);
		expect(groups[0].family).toBe("deepseek");
		expect(groups[0].options).toHaveLength(3);
		expect(groups[0].defaultValue).toBe("ds-high");
	});

	it("sorts levels by priority", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "deepseek(max)", value: "ds-max" },
			{ name: "deepseek(low)", value: "ds-low" },
			{ name: "deepseek(high)", value: "ds-high" },
		];
		const groups = groupModelsByFamily(opts);
		const levels = groups[0].options.map((o) => getModelLevel(o.name));
		expect(levels).toEqual(["low", "high", "max"]);
	});

	it("returns empty when models have no levels and no shared prefix", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "claude-sonnet-4", value: "cs4" },
			{ name: "gpt-4o", value: "gpt4o" },
		];
		const groups = groupModelsByFamily(opts);
		expect(groups).toHaveLength(0);
	});

	it("groups by prefix when no level suffixes found", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "gpt-4o", value: "gpt-4o" },
			{ name: "gpt-4o-mini", value: "gpt-4o-mini" },
			{ name: "gpt-4-turbo", value: "gpt-4-turbo" },
			{ name: "claude-sonnet-4", value: "claude-sonnet-4" },
		];
		const groups = groupModelsByFamily(opts);
		expect(groups).toHaveLength(2);
		const gptGroup = groups.find((g) => g.family === "gpt");
		const claudeGroup = groups.find((g) => g.family === "claude");
		expect(gptGroup?.options).toHaveLength(3);
		expect(claudeGroup?.options).toHaveLength(1);
	});

	it("mixes grouped and ungrouped models", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "deepseek(low)", value: "ds-low" },
			{ name: "deepseek(high)", value: "ds-high" },
			{ name: "claude-sonnet-4", value: "cs4" },
		];
		const groups = groupModelsByFamily(opts);
		expect(groups).toHaveLength(2);
		const dsGroup = groups.find((g) => g.family === "deepseek");
		const csGroup = groups.find((g) => g.family === "claude-sonnet-4");
		expect(dsGroup?.options).toHaveLength(2);
		expect(csGroup?.options).toHaveLength(1);
	});

	it("defaults to medium level if available", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "model(low)", value: "m-low" },
			{ name: "model(medium)", value: "m-med" },
			{ name: "model(high)", value: "m-high" },
		];
		const groups = groupModelsByFamily(opts);
		expect(groups[0].defaultValue).toBe("m-med");
	});

	it("defaults to pro level if available", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "model(mini)", value: "m-mini" },
			{ name: "model(pro)", value: "m-pro" },
		];
		const groups = groupModelsByFamily(opts);
		expect(groups[0].defaultValue).toBe("m-pro");
	});

	it("defaults to middle option when no preferred level", () => {
		const opts: SessionConfigSelectOption[] = [
			{ name: "model(mini)", value: "m-mini" },
			{ name: "model(ultra)", value: "m-ultra" },
		];
		const groups = groupModelsByFamily(opts);
		expect(groups[0].defaultValue).toBe("m-ultra");
	});
});
