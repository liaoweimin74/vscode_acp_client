import type {
	Message,
	MessageChunkData,
	MessageUsage,
	ToolCallData,
} from "@shared/types/extension";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { t } from "../i18n";
import { CodeBlock } from "./CodeBlock";
import { SubAgentView } from "./SubAgentView";
import { ToolCallCard } from "./ToolCallCard";
import "./MessageItem.css";

interface MessageItemProps {
	message: Message;
	isStreaming?: boolean;
}

function formatTime(ts: number): string {
	return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ThoughtChunks({ chunks }: { chunks: MessageChunkData[] }) {
	const thoughts = chunks.filter((c) => c.type === "thought");
	if (thoughts.length === 0) return null;
	const combined = thoughts.map((c) => c.content.replace(/\n+$/, "")).join("");

	return (
		<details className="acp-message-item__thoughts">
			<summary className="acp-message-item__thoughts-summary">{t("message.thinking")}</summary>
			<div className="acp-message-item__thoughts-content">
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{combined}</ReactMarkdown>
			</div>
		</details>
	);
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const s = Math.floor(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rs = s % 60;
	return `${m}m${rs}s`;
}

function formatTokens(used?: number, total?: number): string {
	if (used === undefined) return "";
	const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
	if (total !== undefined) return `${fmt(used)}/${fmt(total)}`;
	return fmt(used);
}

function MessageFooter({
	usage,
	durationMs,
	modelName,
}: { usage?: MessageUsage; durationMs?: number; modelName?: string }) {
	const parts: string[] = [];
	if (modelName) parts.push(modelName);
	if (durationMs !== undefined) parts.push(formatDuration(durationMs));
	if (usage?.tokensUsed !== undefined)
		parts.push(`${formatTokens(usage.tokensUsed, usage.tokensTotal)} ${t("message.tokens")}`);
	if (usage?.costAmount !== undefined) {
		const cur = usage.costCurrency ?? "USD";
		parts.push(`${usage.costAmount.toFixed(4)} ${cur}`);
	}
	if (parts.length === 0) return null;
	return <div className="acp-message-item__footer">{parts.join(" · ")}</div>;
}

function CollapsibleText({ text }: { text: string }) {
	const [expanded, setExpanded] = useState(false);
	return (
		<span
			className={`acp-message-item__collapsible${expanded ? " acp-message-item__collapsible--expanded" : ""}`}
			onClick={() => setExpanded(!expanded)}
			role="button"
			tabIndex={0}
			aria-expanded={expanded}
		>
			{expanded ? (
				<pre className="acp-message-item__collapsible-full">{text}</pre>
			) : (
				<>
					<span className="acp-message-item__collapsible-preview">{text.slice(0, 10)}...</span>
					<span className="acp-message-item__collapsible-count">{text.length} chars</span>
				</>
			)}
		</span>
	);
}

interface ClipboardSegment {
	type: "text" | "clipboard";
	content: string;
}

function parseClipboardTags(text: string): ClipboardSegment[] {
	const segments: ClipboardSegment[] = [];
	const regex = /<clipboard>([\s\S]*?)<\/clipboard>/g;
	let lastIndex = 0;
	let match;
	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
		}
		segments.push({ type: "clipboard", content: match[1].replace(/^\n|\n$/g, "") });
		lastIndex = regex.lastIndex;
	}
	if (lastIndex < text.length) {
		segments.push({ type: "text", content: text.slice(lastIndex) });
	}
	return segments;
}

function UserContent({ content }: { content: string }) {
	const segments = parseClipboardTags(content);
	return (
		<>
			{segments.map((seg, i) =>
				seg.type === "clipboard" ? (
					<CollapsibleText key={`cb-${i}`} text={seg.content} />
				) : (
					<ReactMarkdown
						key={`txt-${i}`}
						remarkPlugins={[remarkGfm]}
						components={{
							code({ className, children, ...props }) {
								const match = /language-(\w+)/.exec(className ?? "");
								const codeStr =
									typeof children === "string"
										? children.replace(/\n$/, "")
										: String(children).replace(/\n$/, "");
								if (match) {
									return <CodeBlock code={codeStr} language={match[1]} />;
								}
								return (
									<code className="acp-message-item__inline-code" {...props}>
										{children}
									</code>
								);
							},
							pre({ children }) {
								return <>{children}</>;
							},
							a({ href, children }) {
								return (
									<a href={href} target="_blank" rel="noopener noreferrer">
										{children}
									</a>
								);
							},
						}}
					>
						{seg.content}
					</ReactMarkdown>
				),
			)}
		</>
	);
}

export function MessageItem({ message, isStreaming }: MessageItemProps) {
	const {
		role,
		content,
		timestamp,
		chunks,
		toolCalls,
		subAgentId,
		subAgentMessages,
		usage,
		durationMs,
		modelName,
	} = message;

	return (
		<div className={`acp-message-item acp-message-item--${role}`}>
			<div className="acp-message-item__avatar">
				{role === "user" ? (
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						role="img"
						aria-label={t("message.user")}
					>
						<circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" />
						<path
							d="M2 15C2 11.5 4.5 9 8 9C11.5 9 14 11.5 14 15"
							stroke="currentColor"
							strokeWidth="1.2"
							strokeLinecap="round"
						/>
					</svg>
				) : (
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						role="img"
						aria-label={t("message.assistant")}
					>
						<rect
							x="2"
							y="2"
							width="12"
							height="12"
							rx="3"
							stroke="currentColor"
							strokeWidth="1.2"
						/>
						<circle cx="6" cy="7" r="1" fill="currentColor" />
						<circle cx="10" cy="7" r="1" fill="currentColor" />
						<path
							d="M5.5 10.5C5.5 10.5 7 12 8 12C9 12 10.5 10.5 10.5 10.5"
							stroke="currentColor"
							strokeWidth="0.8"
							strokeLinecap="round"
						/>
					</svg>
				)}
			</div>
			<div className="acp-message-item__body">
				<div className="acp-message-item__header">
					<span className="acp-message-item__role">
						{role === "user" ? t("message.you") : t("message.assistant")}
					</span>
					<span className="acp-message-item__time">{formatTime(timestamp)}</span>
				</div>
				{chunks && <ThoughtChunks chunks={chunks} />}
				<div className="acp-message-item__content">
					{role === "user" ? (
						<UserContent content={content} />
					) : (
						<ReactMarkdown
							remarkPlugins={[remarkGfm]}
							components={{
								code({ className, children, ...props }) {
									const match = /language-(\w+)/.exec(className ?? "");
									const codeStr =
										typeof children === "string"
											? children.replace(/\n$/, "")
											: String(children).replace(/\n$/, "");
									if (match) {
										return <CodeBlock code={codeStr} language={match[1]} />;
									}
									return (
										<code className="acp-message-item__inline-code" {...props}>
											{children}
										</code>
									);
								},
								pre({ children }) {
									return <>{children}</>;
								},
								a({ href, children }) {
									return (
										<a href={href} target="_blank" rel="noopener noreferrer">
											{children}
										</a>
									);
								},
							}}
						>
							{content}
						</ReactMarkdown>
					)}
					{isStreaming && <span className="acp-message-item__cursor" />}
				</div>
				{toolCalls && toolCalls.length > 0 && (
					<div className="acp-message-item__tools">
						{toolCalls.map((tc: ToolCallData) => (
							<ToolCallCard key={tc.id} toolCall={tc} />
						))}
					</div>
				)}
				{subAgentId && <SubAgentView subAgentId={subAgentId} subAgentMessages={subAgentMessages} />}
				{role === "assistant" && !isStreaming && (
					<MessageFooter usage={usage} durationMs={durationMs} modelName={modelName} />
				)}
			</div>
		</div>
	);
}
