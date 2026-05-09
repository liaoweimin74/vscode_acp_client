import type { Message } from "@shared/types/extension";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { useStore } from "../store";
import { selActiveSession, selIsStreaming, selMessages } from "../store/selectors";
import { MessageItem } from "./MessageItem";
import "./MessageList.css";

interface QAPair {
	userMessage: Message;
	assistantMessages: Message[];
}

function groupIntoQAPairs(messages: Message[]): QAPair[] {
	const pairs: QAPair[] = [];
	let i = 0;
	while (i < messages.length) {
		if (messages[i].role === "user") {
			const userMsg = messages[i];
			const assistantMsgs: Message[] = [];
			i++;
			while (i < messages.length && messages[i].role === "assistant") {
				assistantMsgs.push(messages[i]);
				i++;
			}
			pairs.push({ userMessage: userMsg, assistantMessages: assistantMsgs });
		} else {
			pairs.push({ userMessage: messages[i], assistantMessages: [] });
			i++;
		}
	}
	return pairs;
}

function QAPairView({
	pair,
	isStreaming,
	isLast,
}: {
	pair: QAPair;
	isStreaming: boolean;
	isLast: boolean;
}) {
	const [collapsed, setCollapsed] = useState(false);
	const hasAssistant = pair.assistantMessages.length > 0;
	const isStreamingThisPair = isStreaming && isLast && hasAssistant;

	if (!hasAssistant) {
		return <MessageItem message={pair.userMessage} />;
	}

	return (
		<div className="acp-qa-pair">
			<div className="acp-qa-pair__question">
				<MessageItem message={pair.userMessage} />
				{!isStreamingThisPair && (
					<button
						type="button"
						className="acp-qa-pair__toggle"
						onClick={() => setCollapsed(!collapsed)}
						title={collapsed ? t("message.expandAnswer") : t("message.collapseAnswer")}
						aria-expanded={!collapsed}
					>
						<svg
							className={`acp-qa-pair__chevron${collapsed ? "" : " acp-qa-pair__chevron--open"}`}
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
						<span className="acp-qa-pair__toggle-label">
							{collapsed ? t("message.showAnswer") : t("message.hideAnswer")}
						</span>
					</button>
				)}
			</div>
			{(!collapsed || isStreamingThisPair) && (
				<div className="acp-qa-pair__answers">
					{pair.assistantMessages.map((msg, idx) => (
						<MessageItem
							key={msg.id}
							message={msg}
							isStreaming={isStreamingThisPair && idx === pair.assistantMessages.length - 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function MessageList() {
	const activeSession = useStore(selActiveSession);
	const messages = useStore(selMessages);
	const isStreaming = useStore(selIsStreaming);
	const listRef = useRef<HTMLDivElement>(null);
	const userScrolledRef = useRef(false);

	const sessionMessages = activeSession
		? (messages.get(activeSession) ?? [])
		: (messages.get("__pending__") ?? []);

	const qaPairs = groupIntoQAPairs(sessionMessages);

	const scrollToBottom = useCallback((force = false) => {
		if (!listRef.current) return;
		if (!force && userScrolledRef.current) return;
		listRef.current.scrollTop = listRef.current.scrollHeight;
	}, []);

	const handleScroll = useCallback(() => {
		if (!listRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } = listRef.current;
		userScrolledRef.current = scrollHeight - scrollTop - clientHeight > 40;
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: activeSession triggers scroll reset on session switch
	useEffect(() => {
		userScrolledRef.current = false;
		scrollToBottom(true);
	}, [activeSession, scrollToBottom]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: messages/isStreaming trigger scroll on new content
	useEffect(() => {
		requestAnimationFrame(() => scrollToBottom());
	}, [messages, isStreaming, scrollToBottom]);

	return (
		<div className="acp-message-list" ref={listRef} onScroll={handleScroll}>
			{qaPairs.map((pair, idx) => (
				<QAPairView
					key={pair.userMessage.id}
					pair={pair}
					isStreaming={isStreaming}
					isLast={idx === qaPairs.length - 1}
				/>
			))}
			{isStreaming &&
				!(
					sessionMessages.length > 0 &&
					sessionMessages[sessionMessages.length - 1].role === "assistant"
				) && (
					<div className="acp-message-list__thinking">
						<span className="acp-message-list__thinking-dot" />
						<span className="acp-message-list__thinking-dot" />
						<span className="acp-message-list__thinking-dot" />
					</div>
				)}
			{sessionMessages.length === 0 && !isStreaming && (
				<div className="acp-message-list__empty">{t("message.noMessages")}</div>
			)}
		</div>
	);
}
