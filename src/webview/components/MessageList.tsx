import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store";
import { selActiveSession, selMessages, selIsStreaming } from "../store/selectors";
import { MessageItem } from "./MessageItem";
import { t } from "../i18n";
import "./MessageList.css";

export function MessageList() {
	const activeSession = useStore(selActiveSession);
	const messages = useStore(selMessages);
	const isStreaming = useStore(selIsStreaming);
	const listRef = useRef<HTMLDivElement>(null);
	const userScrolledRef = useRef(false);

	const sessionMessages = activeSession
		? messages.get(activeSession) ?? []
		: messages.get("__pending__") ?? [];

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

	useEffect(() => {
		userScrolledRef.current = false;
		scrollToBottom(true);
	}, [activeSession, scrollToBottom]);

	useEffect(() => {
		requestAnimationFrame(() => scrollToBottom());
	}, [messages, isStreaming, scrollToBottom]);

	return (
		<div className="acp-message-list" ref={listRef} onScroll={handleScroll}>
			{sessionMessages.map((msg, idx) => (
				<MessageItem
					key={msg.id}
					message={msg}
					isStreaming={isStreaming && idx === sessionMessages.length - 1 && msg.role === "assistant"}
				/>
			))}
			{isStreaming && !(sessionMessages.length > 0 && sessionMessages[sessionMessages.length - 1].role === "assistant") && (
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
