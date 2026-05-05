import type { SessionConfigSelectOption } from "@agentclientprotocol/sdk";

export interface SelectGroup {
	group: string;
	name: string;
	options: SessionConfigSelectOption[];
}

export interface ModelGroup {
	family: string;
	label: string;
	options: SessionConfigSelectOption[];
	defaultValue?: string;
}

export function isGroupedOptions(
	options: SessionConfigSelectOption[] | SelectGroup[],
): options is SelectGroup[] {
	return options.length > 0 && "group" in options[0];
}

export function flattenSelectOptions(
	options: SessionConfigSelectOption[] | SelectGroup[],
): SessionConfigSelectOption[] {
	if (options.length === 0) return [];
	if (isGroupedOptions(options)) {
		return options.flatMap((g) => g.options);
	}
	return options;
}

export function findGroupByValue(
	groups: SelectGroup[],
	currentValue: string,
): SelectGroup | undefined {
	return groups.find((g) => g.options.some((o) => o.value === currentValue));
}

export function getDefaultLevel(
	options: SessionConfigSelectOption[],
): string | undefined {
	const levels = ["high", "pro", "medium"];
	for (const level of levels) {
		const found = options.find((o) => getModelLevel(o.name) === level);
		if (found) return found.value;
	}
	return options[Math.floor(options.length / 2)]?.value;
}

const LEVEL_PATTERN = /\((low|medium|high|max|mini|lite|pro|ultra)\)/i;
const LEVEL_PRIORITY: Record<string, number> = { low: 1, mini: 1, lite: 1, medium: 2, high: 3, pro: 3, max: 4, ultra: 4 };

function parseModelName(name: string): { family: string; level: string | null } {
	const match = name.match(LEVEL_PATTERN);
	if (match) {
		const level = match[1].toLowerCase();
		const family = name.replace(LEVEL_PATTERN, "").trim();
		return { family, level };
	}
	return { family: name, level: null };
}

function inferFamily(name: string): string {
	const prefix = name.match(/^[a-zA-Z]+/);
	return prefix ? prefix[0].toLowerCase() : name;
}

export function groupModelsByFamily(options: SessionConfigSelectOption[]): ModelGroup[] {
	const hasAnyLevel = options.some((o) => parseModelName(o.name).level !== null);

	if (!hasAnyLevel) {
		const byPrefix = new Map<string, SessionConfigSelectOption[]>();
		for (const opt of options) {
			const family = inferFamily(opt.name);
			if (!byPrefix.has(family)) byPrefix.set(family, []);
			byPrefix.get(family)!.push(opt);
		}
		if ([...byPrefix.values()].every((opts) => opts.length === 1)) return [];

		return [...byPrefix.entries()].map(([family, opts]) => ({
			family,
			label: family.charAt(0).toUpperCase() + family.slice(1),
			options: opts,
			defaultValue: opts[0]?.value,
		}));
	}

	const groups = new Map<string, { label: string; options: SessionConfigSelectOption[] }>();

	for (const opt of options) {
		const { family, level } = parseModelName(opt.name);
		if (!groups.has(family)) {
			groups.set(family, { label: family, options: [] });
		}
		groups.get(family)!.options.push(opt);
	}

	const result: ModelGroup[] = [];
	for (const [family, data] of groups) {
		const sorted = [...data.options].sort((a, b) => {
			const la = parseModelName(a.name).level;
			const lb = parseModelName(b.name).level;
			return (LEVEL_PRIORITY[la ?? ""] ?? 0) - (LEVEL_PRIORITY[lb ?? ""] ?? 0);
		});
		const defaultOpt = sorted.find((o) => {
			const lvl = parseModelName(o.name).level;
			return lvl === "high" || lvl === "pro" || lvl === "medium";
		}) ?? sorted[Math.floor(sorted.length / 2)];
		result.push({
			family,
			label: data.label,
			options: sorted,
			defaultValue: defaultOpt?.value,
		});
	}

	return result;
}

export function getModelLevel(name: string): string | null {
	return parseModelName(name).level;
}
