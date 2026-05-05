import type { ToolCallData, ToolCallDiff, ToolKind } from "@shared/types/extension";
import { useMemo, useState } from "react";
import { t } from "../i18n";
import { CodeBlock } from "./CodeBlock";
import "./ToolCallCard.css";

interface ToolCallCardProps {
	toolCall: ToolCallData;
}

const KIND_ICONS: Record<ToolKind, string> = {
	read: "M2 2h12v12H2z M4 5h8M4 7h8M4 9h5",
	edit: "M12 2L14 4L6 12H4V10L12 2z",
	delete: "M4 4h8M6 4V3h4v1M5 4v9h6V4",
	move: "M4 8h8M9 5l3 3-3 3",
	search: "M7 3a4 4 0 100 8 4 4 0 000-8zM13 13l-2.5-2.5",
	execute: "M4 3l8 5-8 5V3z",
	think: "M8 2a5 5 0 100 10A5 5 0 008 2zM6 7h4",
	fetch: "M3 8h10M10 5l3 3-3 3",
	switch_mode: "M4 4h3v3H4zM9 4h3v3H9zM4 9h3v3H4zM9 9h3v3H9z",
	other: "M5 2L11 8L5 14",
};

const KIND_LABELS: Record<ToolKind, string> = {
	read: t("tool.read"),
	edit: t("tool.edit"),
	delete: t("tool.delete"),
	move: t("tool.move"),
	search: t("tool.search"),
	execute: t("tool.execute"),
	think: t("tool.think"),
	fetch: t("tool.fetch"),
	switch_mode: t("tool.switchMode"),
	other: t("tool.other"),
};

function DiffView({ diff }: { diff: ToolCallDiff }) {
	const lines = useMemo(() => {
		const oldLines = (diff.oldText ?? "").split("\n");
		const newLines = diff.newText.split("\n");
		const result: { type: "add" | "remove" | "ctx"; text: string }[] = [];

		let oi = 0;
		let ni = 0;
		while (oi < oldLines.length || ni < newLines.length) {
			if (oi < oldLines.length && ni < newLines.length) {
				if (oldLines[oi] === newLines[ni]) {
					result.push({ type: "ctx", text: oldLines[oi] });
					oi++;
					ni++;
				} else {
					result.push({ type: "remove", text: oldLines[oi] });
					oi++;
				}
			} else if (oi < oldLines.length) {
				result.push({ type: "remove", text: oldLines[oi] });
				oi++;
			} else {
				result.push({ type: "add", text: newLines[ni] });
				ni++;
			}
		}

		return result;
	}, [diff.oldText, diff.newText]);

	return (
		<div className="acp-tool-card__diff">
			<div className="acp-tool-card__diff-path">{diff.path}</div>
			<pre className="acp-tool-card__diff-content">
				{lines.map((line, i) => (
					<div
						key={`${line.type}-${i}`}
						className={`acp-tool-card__diff-line acp-tool-card__diff-line--${line.type}`}
					>
						<span className="acp-tool-card__diff-marker">
							{line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
						</span>
						<span>{line.text}</span>
					</div>
				))}
			</pre>
		</div>
	);
}

function extractCommand(args: string): string | null {
	try {
		const parsed = JSON.parse(args);
		if (typeof parsed.command === "string") return parsed.command;
		if (typeof parsed.cmd === "string") return parsed.cmd;
	} catch {}
	return null;
}

function extractPath(args: string): string | null {
	try {
		const parsed = JSON.parse(args);
		if (typeof parsed.file_path === "string") return parsed.file_path;
		if (typeof parsed.filePath === "string") return parsed.filePath;
		if (typeof parsed.path === "string") return parsed.path;
	} catch {}
	return null;
}

function extractPattern(args: string): string | null {
	try {
		const parsed = JSON.parse(args);
		if (typeof parsed.pattern === "string") return parsed.pattern;
		if (typeof parsed.query === "string") return parsed.query;
	} catch {}
	return null;
}

function getLanguageFromPath(path: string): string {
	const ext = path.split(".").pop()?.toLowerCase() ?? "";
	const langMap: Record<string, string> = {
		ts: "typescript",
		tsx: "tsx",
		js: "javascript",
		jsx: "jsx",
		py: "python",
		rs: "rust",
		go: "go",
		rb: "ruby",
		java: "java",
		cs: "csharp",
		cpp: "cpp",
		c: "c",
		html: "html",
		css: "css",
		scss: "scss",
		json: "json",
		yaml: "yaml",
		yml: "yaml",
		md: "markdown",
		sql: "sql",
		sh: "bash",
		bash: "bash",
		zsh: "bash",
		toml: "toml",
		xml: "xml",
		swift: "swift",
		kt: "kotlin",
	};
	return langMap[ext] ?? ext;
}

function renderToolBody(toolCall: ToolCallData) {
	const { kind, content, arguments: args, result, isError } = toolCall;

	if (content?.length) {
		return content.map((c, i) => {
			const key = `${c.type}-${i}`;
			if (c.type === "diff" && c.diff) {
				return <DiffView key={key} diff={c.diff} />;
			}
			if (c.type === "content" && c.content) {
				if (kind === "execute") {
					return <CodeBlock key={key} code={c.content} language="bash" />;
				}
				if (kind === "read") {
					const path = extractPath(args);
					const lang = path ? getLanguageFromPath(path) : "text";
					return <CodeBlock key={key} code={c.content} language={lang} />;
				}
				return <CodeBlock key={key} code={c.content} language="text" />;
			}
			if (c.type === "terminal") {
				return (
					<div key={key} className="acp-tool-card__terminal">
						Terminal: {c.terminalId}
					</div>
				);
			}
			if (c.type === "image" && c.data && c.mimeType) {
				const src = `data:${c.mimeType};base64,${c.data}`;
				return (
					<div key={key} className="acp-tool-card__image">
						<img src={src} alt={t("tool.output")} />
					</div>
				);
			}
			if (c.type === "audio" && c.data && c.mimeType) {
				const src = `data:${c.mimeType};base64,${c.data}`;
				return (
					<div key={key} className="acp-tool-card__audio">
						{/* biome-ignore lint/a11y/useMediaCaption: tool output audio, not media content */}
						<audio controls={true} src={src} aria-label={t("tool.outputAudio")} />
					</div>
				);
			}
			return null;
		});
	}

	if (kind === "execute") {
		const cmd = extractCommand(args);
		if (result) {
			try {
				const parsed = JSON.parse(result);
				const output =
					typeof parsed === "string" ? parsed : (parsed.stdout ?? parsed.output ?? result);
				return <CodeBlock code={String(output)} language="bash" />;
			} catch {
				return <CodeBlock code={result} language="bash" />;
			}
		}
		if (cmd) return <CodeBlock code={cmd} language="bash" />;
	}

	if (kind === "edit" && result) {
		try {
			const parsed = JSON.parse(result);
			if (parsed.newText || parsed.oldText) {
				return (
					<DiffView
						diff={{
							path: parsed.path ?? extractPath(args) ?? "",
							newText: parsed.newText ?? "",
							oldText: parsed.oldText,
						}}
					/>
				);
			}
		} catch {}
	}

	if (kind === "read" && result) {
		const path = extractPath(args);
		const lang = path ? getLanguageFromPath(path) : "text";
		try {
			const parsed = JSON.parse(result);
			const text = typeof parsed === "string" ? parsed : (parsed.content ?? parsed.text ?? result);
			return <CodeBlock code={String(text)} language={lang} />;
		} catch {
			return <CodeBlock code={result} language={lang} />;
		}
	}

	if (kind === "search") {
		try {
			const parsed = JSON.parse(result ?? args);
			const text = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
			return <pre className="acp-tool-card__pre acp-tool-card__pre--muted">{text}</pre>;
		} catch {
			return <pre className="acp-tool-card__pre acp-tool-card__pre--muted">{result ?? args}</pre>;
		}
	}

	if (result) {
		return (
			<pre className={`acp-tool-card__pre ${isError ? "acp-tool-card__pre--error" : ""}`}>
				{result}
			</pre>
		);
	}

	if (args) {
		return <pre className="acp-tool-card__pre">{args}</pre>;
	}

	return null;
}

function ToolParams({ toolCall }: { toolCall: ToolCallData }) {
	const { kind, arguments: args, locations } = toolCall;

	if (kind === "execute") {
		const cmd = extractCommand(args);
		if (cmd) return <span className="acp-tool-card__param">{cmd}</span>;
	}

	if (kind === "edit" || kind === "read" || kind === "delete") {
		const path = locations?.[0]?.path ?? extractPath(args);
		if (path) {
			const line = locations?.[0]?.line;
			return (
				<span className="acp-tool-card__param">
					{path}
					{line ? `:${line}` : ""}
				</span>
			);
		}
	}

	if (kind === "search") {
		const pattern = extractPattern(args);
		if (pattern) return <span className="acp-tool-card__param">{pattern}</span>;
	}

	if (kind === "move" && locations?.length) {
		return <span className="acp-tool-card__param">{locations[0].path}</span>;
	}

	return null;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
	const [expanded, setExpanded] = useState(false);
	const { kind, status, isError } = toolCall;

	const iconPath = KIND_ICONS[kind ?? "other"];
	const label = KIND_LABELS[kind ?? "other"];
	const isActive = status === "pending" || status === "in_progress";

	return (
		<div
			className={`acp-tool-card ${expanded ? "acp-tool-card--expanded" : ""} ${isActive ? "acp-tool-card--active" : ""} ${isError ? "acp-tool-card--error" : ""}`}
		>
			<button
				type="button"
				className="acp-tool-card__header"
				onClick={() => setExpanded(!expanded)}
			>
				<svg
					className="acp-tool-card__chevron"
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
					aria-hidden="true"
				>
					<path
						d="M4 3L7.5 6L4 9"
						stroke="currentColor"
						strokeWidth="1.2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<svg
					className={`acp-tool-card__icon ${kind ? `acp-tool-card__icon--${kind}` : ""}`}
					width="14"
					height="14"
					viewBox="0 0 16 16"
					fill="none"
					role="img"
					aria-label={label}
				>
					<path
						d={iconPath}
						stroke="currentColor"
						strokeWidth="1.2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<span className="acp-tool-card__name">{toolCall.name}</span>
				<span className="acp-tool-card__kind-badge">{label}</span>
				<ToolParams toolCall={toolCall} />
				{isActive && <span className="acp-tool-card__spinner" />}
				{status === "completed" && (
					<span className="acp-tool-card__status acp-tool-card__status--done">✓</span>
				)}
				{isError && <span className="acp-tool-card__error-badge">{t("tool.error")}</span>}
			</button>
			{expanded && <div className="acp-tool-card__body">{renderToolBody(toolCall)}</div>}
		</div>
	);
}
