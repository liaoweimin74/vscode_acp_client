import type { Message } from "@shared/types/extension";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import { ToolCallCard } from "./ToolCallCard";
import "./SubAgentView.css";

interface SubAgentViewProps {
	subAgentId: string;
	subAgentMessages?: Message[];
}

function SubAgentMessage({ message }: { message: Message }) {
	return (
		<div className={`acp-sub-agent__msg acp-sub-agent__msg--${message.role}`}>
			<div className="acp-sub-agent__msg-role">{message.role === "user" ? "You" : "Assistant"}</div>
			<div className="acp-sub-agent__msg-content">
				{message.role === "assistant" ? (
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						components={{
							code({ className, children, ...props }) {
								const match = /language-(\w+)/.exec(className ?? "");
								const codeStr = String(children).replace(/\n$/, "");
								if (match) {
									return <CodeBlock code={codeStr} language={match[1]} />;
								}
								return (
									<code className="acp-sub-agent__inline-code" {...props}>
										{children}
									</code>
								);
							},
							pre({ children }) {
								return <>{children}</>;
							},
						}}
					>
						{message.content}
					</ReactMarkdown>
				) : (
					message.content
				)}
			</div>
			{message.toolCalls && message.toolCalls.length > 0 && (
				<div className="acp-sub-agent__tools">
					{message.toolCalls.map((tc) => (
						<ToolCallCard key={tc.id} toolCall={tc} />
					))}
				</div>
			)}
			{message.subAgentMessages && message.subAgentMessages.length > 0 && (
				<div className="acp-sub-agent__nested">
					{message.subAgentMessages.map((sub) => (
						<SubAgentMessage key={sub.id} message={sub} />
					))}
				</div>
			)}
		</div>
	);
}

export function SubAgentView({ subAgentId, subAgentMessages }: SubAgentViewProps) {
	const [expanded, setExpanded] = useState(false);

	const msgCount = subAgentMessages?.length ?? 0;
	const toolCount = subAgentMessages?.reduce((n, m) => n + (m.toolCalls?.length ?? 0), 0) ?? 0;
	const summary = `${msgCount} message${msgCount !== 1 ? "s" : ""}${toolCount > 0 ? ` · ${toolCount} tool${toolCount !== 1 ? "s" : ""}` : ""}`;

	return (
		<div className={`acp-sub-agent ${expanded ? "acp-sub-agent--expanded" : ""}`}>
			<button
				type="button"
				className="acp-sub-agent__toggle"
				onClick={() => setExpanded(!expanded)}
			>
				<svg
					className="acp-sub-agent__chevron"
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
					className="acp-sub-agent__icon"
					width="14"
					height="14"
					viewBox="0 0 16 16"
					fill="none"
					role="img"
					aria-label="Sub-agent"
				>
					<rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.2" />
					<path
						d="M6 6H10M6 8H10M6 10H8"
						stroke="currentColor"
						strokeWidth="0.8"
						strokeLinecap="round"
					/>
				</svg>
				<span className="acp-sub-agent__label">Sub-agent</span>
				<span className="acp-sub-agent__summary">{summary}</span>
			</button>
			{expanded && subAgentMessages && subAgentMessages.length > 0 && (
				<div className="acp-sub-agent__content">
					{subAgentMessages.map((msg) => (
						<SubAgentMessage key={msg.id} message={msg} />
					))}
				</div>
			)}
		</div>
	);
}
