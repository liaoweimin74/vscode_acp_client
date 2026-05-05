import type { MentionItem } from "@shared/types/extension";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { postMessage } from "../api/vscode";
import { useStore } from "../store";
import {
	selInputText, selSetInputText, selSendMessage, selIsStreaming,
	selIsCommandMenuOpen, selSetCommandMenuOpen, selCancelPrompt,
	selEscCancelTimer, selSetEscCancelTimer, selQueuedPrompts,
	selSendQueuedPromptNow, selActiveSession, selConnectionError,
	selReconnectFailed, selReconnectAgent, selSlashCommands,
	selAgentRoles, selMentionMenuOpen, selSetMentionMenuOpen,
	selOpenCommandPopup, selRemoveQueuedPrompt, selPastedSnippets,
	selRemovePastedSnippet, selActiveAgent, selAgents,
	selAttachments, selRemoveAttachment,
} from "../store/selectors";
import { MentionMenu } from "./MentionMenu";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { t } from "../i18n";
import "./PromptInput.css";

const DEFAULT_COMMANDS = [
	{ name: "/help", description: t("command.help") },
	{ name: "/sessions", description: t("command.sessions") },
	{ name: "/models", description: t("command.models") },
	{ name: "/think", description: t("command.think") },
	{ name: "/clear", description: t("command.clear") },
	{ name: "/agent", description: t("command.agent") },
];

const BUILTIN_COMMANDS = new Set(["sessions", "models"]);

const BROWSE_ACTIONS: MentionItem[] = [
	{ type: "action", action: "browse-files", name: t("mention.browseFiles"), description: t("mention.attachFiles") },
	{ type: "action", action: "browse-folders", name: t("mention.browseFolders"), description: t("mention.attachDirectories") },
];

/** Extract the @ mention query from text at cursor position */
function getMentionQuery(text: string): { query: string; startIndex: number } | null {
	const atIdx = text.lastIndexOf("@");
	if (atIdx === -1) return null;
	const afterAt = text.slice(atIdx + 1);
	// Only trigger if @ is at start or preceded by whitespace, and no spaces after @
	if (atIdx > 0 && !/\s/.test(text[atIdx - 1])) return null;
	if (afterAt.includes(" ")) return null;
	return { query: afterAt, startIndex: atIdx };
}

export function PromptInput() {
	const inputText = useStore(selInputText);
	const setInputText = useStore(selSetInputText);
	const sendMessage = useStore(selSendMessage);
	const isStreaming = useStore(selIsStreaming);
	const isCommandMenuOpen = useStore(selIsCommandMenuOpen);
	const setCommandMenuOpen = useStore(selSetCommandMenuOpen);
	const cancelPrompt = useStore(selCancelPrompt);
	const escCancelTimer = useStore(selEscCancelTimer);
	const setEscCancelTimer = useStore(selSetEscCancelTimer);
	const queuedPrompts = useStore(selQueuedPrompts);
	const sendQueuedPromptNow = useStore(selSendQueuedPromptNow);
	const activeSession = useStore(selActiveSession);
	const connectionError = useStore(selConnectionError);
	const reconnectFailed = useStore(selReconnectFailed);
	const reconnectAgent = useStore(selReconnectAgent);
	const slashCommands = useStore(selSlashCommands);
	const agentRoles = useStore(selAgentRoles);
	const commands =
		slashCommands.length > 0 ? [...DEFAULT_COMMANDS, ...slashCommands] : DEFAULT_COMMANDS;

	const mentionMenuOpen = useStore(selMentionMenuOpen);
	const setMentionMenuOpen = useStore(selSetMentionMenuOpen);
	const [mentionQuery, setMentionQuery] = useState("");
	const [mentionStartIndex, setMentionStartIndex] = useState(-1);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const inputTextRef = useRef(inputText);
	inputTextRef.current = inputText;
	const mentionStartIndexRef = useRef(mentionStartIndex);
	mentionStartIndexRef.current = mentionStartIndex;
	const mentionQueryRef = useRef(mentionQuery);
	mentionQueryRef.current = mentionQuery;

	const mentionItems: MentionItem[] = [
		...BROWSE_ACTIONS,
		...agentRoles.map((r) => ({
			type: "role" as const,
			id: r.id,
			name: r.name,
			description: r.description,
		})),
	];

	const autoResize = () => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: autoResize must run when inputText changes to adjust height
	useEffect(() => {
		autoResize();
	}, [inputText]);

	const handleChange = (value: string) => {
		setInputText(value);
		if (value.startsWith("/") && !value.includes(" ")) {
			setCommandMenuOpen(true);
			setMentionMenuOpen(false);
		} else {
			setCommandMenuOpen(false);
			const mention = getMentionQuery(value);
			if (mention) {
				setMentionMenuOpen(true);
				setMentionQuery(mention.query);
				setMentionStartIndex(mention.startIndex);
			} else {
				setMentionMenuOpen(false);
			}
		}
	};

	const openCommandPopup = useStore(selOpenCommandPopup);

	const handleSend = () => {
		const trimmed = inputText.trim();
		const hasSnippets = pastedSnippets.length > 0;
		if ((!trimmed && !hasSnippets) || !connectedAgent || connectionError) return;
		if (trimmed.startsWith("/")) {
			const spaceIdx = trimmed.indexOf(" ");
			const command = spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx);
			const args = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1);
			if (BUILTIN_COMMANDS.has(command)) {
				openCommandPopup(command as "sessions" | "models");
				setInputText("");
				setCommandMenuOpen(false);
				return;
			}
			if (isStreaming) {
				const { queuedPrompts: qp, pastedSnippets: ps } = useStore.getState();
				const fullPrompt = ps.length > 0
					? (trimmed || "") + "\n<clipboard>\n" + ps.map((s) => s.fullText).join("\n") + "\n</clipboard>"
					: trimmed;
				useStore.setState({ queuedPrompts: [...qp, fullPrompt], inputText: "", pastedSnippets: [] });
				return;
			}
			postMessage({ type: "slash_command", command, args });
			setInputText("");
			setCommandMenuOpen(false);
			return;
		}
		sendMessage(trimmed);
	};

	const handleMentionSelect = (item: MentionItem) => {
		const currentInputText = inputTextRef.current;
		const currentStartIndex = mentionStartIndexRef.current;
		const currentQuery = mentionQueryRef.current;
		if (item.type === "action") {
			const canSelectFiles = item.action === "browse-files";
			const canSelectFolders = item.action === "browse-folders";
			postMessage({ type: "pick_files", canSelectFiles, canSelectFolders });
			if (currentStartIndex >= 0) {
				const before = currentInputText.slice(0, currentStartIndex);
				const after = currentInputText.slice(currentStartIndex + 1 + currentQuery.length);
				useStore.getState().setInputText(before + after);
			}
			useStore.getState().setMentionMenuOpen(false);
			textareaRef.current?.focus();
			return;
		}
		if (currentStartIndex >= 0) {
			const before = currentInputText.slice(0, currentStartIndex);
			const after = currentInputText.slice(currentStartIndex + 1 + currentQuery.length);
			const insert = `@${item.name} `;
			useStore.getState().setInputText(before + insert + after);
		} else {
			useStore.getState().setInputText(currentInputText + `@${item.name} `);
		}
		useStore.getState().setMentionMenuOpen(false);
		textareaRef.current?.focus();
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (mentionMenuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab")) {
			// Let MentionMenu handle these keys
			return;
		}
		if (mentionMenuOpen && e.key === "Enter") {
			// Let MentionMenu handle Enter to select item
			return;
		}
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
		if (e.key === "Escape") {
			if (mentionMenuOpen) {
				setMentionMenuOpen(false);
				return;
			}
			if (isCommandMenuOpen) {
				setCommandMenuOpen(false);
				return;
			}
			if (isStreaming) {
				if (escCancelTimer !== null) {
					clearTimeout(escCancelTimer);
					setEscCancelTimer(null);
					cancelPrompt();
				} else {
					const timer = window.setTimeout(() => {
						setEscCancelTimer(null);
					}, 1500);
					setEscCancelTimer(timer);
				}
			}
		}
	};

	const handleSlashSelect = (command: string) => {
		setInputText(`${command} `);
		setCommandMenuOpen(false);
		textareaRef.current?.focus();
	};

	const removeQueuedPrompt = useStore(selRemoveQueuedPrompt);

	const pastedSnippets = useStore(selPastedSnippets);
	const removePastedSnippet = useStore(selRemovePastedSnippet);

	const [expandedSnippets, setExpandedSnippets] = useState<Set<string>>(new Set());

	const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const pasted = e.clipboardData.getData("text");
		if (pasted.length > 10) {
			e.preventDefault();
			useStore.getState().addPastedSnippet({
				id: `snippet_${Date.now()}`,
				preview: pasted.slice(0, 10),
				fullText: pasted,
				charCount: pasted.length,
			});
		}
	};

	const toggleSnippetExpand = (id: string) => {
		setExpandedSnippets((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const query = inputText.startsWith("/") && !inputText.includes(" ") ? inputText : "";

	const activeAgent = useStore(selActiveAgent);
	const agents = useStore(selAgents);
	const connectedAgent = agents.find((a) => a.config.id === activeAgent && a.status === "connected");
	const isDisabled = !connectedAgent || !!connectionError;
	const placeholder = connectionError
		? t("prompt.placeholder.connectionError", connectionError)
		: !connectedAgent
			? t("prompt.placeholder.disconnected")
			: t("prompt.placeholder.connected");

	const attachments = useStore(selAttachments);
	const removeAttachment = useStore(selRemoveAttachment);

	return (
		<div className="acp-prompt">
			{escCancelTimer !== null && (
				<div className="acp-prompt__cancel-hint">{t("prompt.cancelHint")}</div>
			)}
			{connectionError && !reconnectFailed && (
				<div className="acp-prompt__error">
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
						<path
							d="M8 5V8M8 10V10.5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
					<span>{connectionError}</span>
				</div>
			)}
			{reconnectFailed && (
				<div className="acp-prompt__error">
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
						<path
							d="M8 5V8M8 10V10.5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
					<span>{t("prompt.agentConnectionLost")}</span>
					<button type="button" className="acp-prompt__reconnect-btn" onClick={reconnectAgent}>
						{t("prompt.reconnect")}
					</button>
				</div>
			)}
			{isCommandMenuOpen && query && (
				<SlashCommandMenu
					commands={commands}
					query={query}
					onSelect={handleSlashSelect}
					onClose={() => setCommandMenuOpen(false)}
				/>
			)}
			{mentionMenuOpen && (
				<MentionMenu
					items={mentionItems}
					query={mentionQuery}
					onSelect={handleMentionSelect}
					onClose={() => setMentionMenuOpen(false)}
				/>
			)}
			{queuedPrompts.length > 0 && (
				<div className="acp-prompt__queue">
					{queuedPrompts.map((p, i) => (
						<div key={`q-${i}-${p.slice(0, 10)}`} className="acp-prompt__queue-item">
							<button
								type="button"
								className="acp-prompt__queue-remove"
								onClick={() => removeQueuedPrompt(i)}
								title={t("prompt.removeFromQueue")}
								aria-label={t("prompt.removeQueuedMessage")}
							>
								<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
									<path
										d="M3 3L9 9M9 3L3 9"
										stroke="currentColor"
										strokeWidth="1.2"
										strokeLinecap="round"
									/>
								</svg>
							</button>
							<span className="acp-prompt__queue-text">{p}</span>
							<button
								type="button"
								className="acp-prompt__queue-send"
								onClick={() => sendQueuedPromptNow(i)}
								title={t("prompt.sendNow")}
								aria-label={t("prompt.sendQueuedMessageNow")}
							>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path
										d="M8 13V3M4 7L8 3L12 7"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
						</div>
					))}
				</div>
			)}
			{attachments.length > 0 && (
				<div className="acp-prompt__attachments">
					{attachments.map((att, i) => (
						<div key={`att-${i}-${att.path}`} className="acp-prompt__attachment-chip" title={att.path}>
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								{att.isDirectory ? (
									<path d="M1 3h5l2 2h7v9H1V3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
								) : (
									<path d="M4 1h5l4 4v9H4V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
								)}
							</svg>
							<span className="acp-prompt__attachment-name">{att.name}</span>
							<button
								type="button"
								className="acp-prompt__attachment-remove"
								onClick={() => removeAttachment(i)}
								title={t("prompt.removeAttachment")}
								aria-label={t("prompt.removeAttachment")}
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
									<path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
								</svg>
							</button>
						</div>
					))}
				</div>
			)}
			{pastedSnippets.length > 0 && (
				<div className="acp-prompt__snippets">
					{pastedSnippets.map((snippet, i) => {
						const isExpanded = expandedSnippets.has(snippet.id);
						return (
							<div
								key={snippet.id}
								className={`acp-prompt__snippet-chip${isExpanded ? " acp-prompt__snippet-chip--expanded" : ""}`}
								onClick={() => toggleSnippetExpand(snippet.id)}
								role="button"
								tabIndex={0}
								aria-expanded={isExpanded}
							>
								{isExpanded ? (
									<pre className="acp-prompt__snippet-full">{snippet.fullText}</pre>
								) : (
									<>
										<span className="acp-prompt__snippet-preview">{snippet.preview}...</span>
										<span className="acp-prompt__snippet-count">{t("prompt.chars", snippet.charCount)}</span>
									</>
								)}
								<button
									type="button"
									className="acp-prompt__attachment-remove"
									onClick={(e) => { e.stopPropagation(); removePastedSnippet(i); }}
								title={t("prompt.removeSnippet")}
								aria-label={t("prompt.removeTextSnippet")}
								>
									<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
										<path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
									</svg>
								</button>
							</div>
						);
					})}
				</div>
			)}
			<div className="acp-prompt__input-wrap">
				<textarea
					ref={textareaRef}
					className="acp-prompt__textarea"
					value={inputText}
					onChange={(e) => handleChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					placeholder={placeholder}
					disabled={isDisabled}
					rows={1}
					aria-label={t("prompt.messageInput")}
				/>
				<button
					type="button"
					className="acp-prompt__send"
					onClick={handleSend}
					disabled={(!inputText.trim() && pastedSnippets.length === 0) || !activeAgent || !!connectionError}
					title={isStreaming ? t("prompt.queueMessage") : t("prompt.sendMessage")}
					aria-label={isStreaming ? t("prompt.queueMessageShort") : t("prompt.sendMessageShort")}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path
							d="M3 8L13 3L8 13L7 9L3 8Z"
							stroke="currentColor"
							strokeWidth="1.2"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
}
