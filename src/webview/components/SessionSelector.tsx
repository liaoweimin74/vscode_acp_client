import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { useStore } from "../store";
import {
	selActiveSession,
	selClearEmptySessions,
	selDeleteSession,
	selNewSession,
	selSessions,
	selSwitchSession,
} from "../store/selectors";
import "./SessionSelector.css";

export function SessionSelector({ onClose }: { onClose: () => void }) {
	const sessions = useStore(selSessions);
	const activeSession = useStore(selActiveSession);
	const switchSession = useStore(selSwitchSession);
	const deleteSession = useStore(selDeleteSession);
	const clearEmptySessions = useStore(selClearEmptySessions);
	const newSession = useStore(selNewSession);

	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
	const items = query
		? sorted.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
		: sorted;
	const emptyCount = sessions.filter((s) => s.messageCount === 0).length;

	useEffect(() => {
		setActiveIndex(0);
	}, [query]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		if (!listRef.current) return;
		const active = listRef.current.querySelector(".is-highlighted");
		active?.scrollIntoView({ block: "nearest" });
	}, [activeIndex]);

	const handleSelect = useCallback(
		(id: string) => {
			switchSession(id);
			onClose();
		},
		[switchSession, onClose],
	);

	const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		setConfirmDelete(id);
	}, []);

	const confirmDeleteSession = useCallback(() => {
		if (confirmDelete) {
			deleteSession(confirmDelete);
			setConfirmDelete(null);
		}
	}, [confirmDelete, deleteSession]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}
			if (items.length === 0) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveIndex((i) => (i + 1) % items.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIndex((i) => (i - 1 + items.length) % items.length);
			} else if (e.key === "Enter") {
				e.preventDefault();
				const item = items[activeIndex];
				if (item) handleSelect(item.id);
			}
		},
		[items, activeIndex, handleSelect, onClose],
	);

	return (
		<div className="acp-session-selector">
			<div className="acp-session-selector__search">
				<svg
					width="12"
					height="12"
					viewBox="0 0 16 16"
					fill="none"
					className="acp-session-selector__search-icon"
				>
					<path
						d="M11 11L14.5 14.5M7 2C9.76142 2 12 4.23858 12 7C12 9.76142 9.76142 12 7 12C4.23858 12 2 9.76142 2 7C2 4.23858 4.23858 2 7 2Z"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</svg>
				<input
					ref={inputRef}
					type="text"
					className="acp-session-selector__search-input"
					placeholder={t("session.searchSessions")}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
			</div>
			<button
				type="button"
				className="acp-session-selector__new"
				onClick={() => {
					newSession();
					onClose();
				}}
				title={t("session.newSessionTitle")}
			>
				<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
					<path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
				{t("session.newSession")}
			</button>
			{emptyCount > 0 && (
				<button
					type="button"
					className="acp-session-selector__clear-empty"
					onClick={() => {
						clearEmptySessions();
						onClose();
					}}
					title={t("session.clearEmptyTitle", emptyCount, emptyCount > 1 ? "s" : "")}
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
						<path
							d="M2 4H14M5.333 4V2.667C5.333 2.298 5.632 2 6 2H10C10.368 2 10.667 2.298 10.667 2.667V4M12 4V13.333C12 13.702 11.702 14 11.333 14H4.667C4.298 14 4 13.702 4 13.333V4"
							stroke="currentColor"
							strokeWidth="1.2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					{t("session.clearEmpty", emptyCount)}
				</button>
			)}
			<div className="acp-session-selector__list" ref={listRef}>
				{items.length === 0 && (
					<div className="acp-session-selector__empty">{t("session.noSessions")}</div>
				)}
				{items.map((s, i) => {
					const isActive = s.id === activeSession;
					const isConfirming = confirmDelete === s.id;
					return (
						<div
							key={s.id}
							role="button"
							tabIndex={0}
							className={`acp-session-selector__item ${isActive ? "is-active" : ""} ${i === activeIndex ? "is-highlighted" : ""}`}
							onClick={() => {
								if (!isConfirming) handleSelect(s.id);
							}}
							onMouseEnter={() => setActiveIndex(i)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !isConfirming) handleSelect(s.id);
							}}
						>
							{isConfirming ? (
								<>
									<span className="acp-session-selector__item-label">
										{t("session.deleteConfirm", s.title)}
									</span>
									<button
										type="button"
										className="acp-session-selector__confirm-yes"
										onClick={(e) => {
											e.stopPropagation();
											confirmDeleteSession();
										}}
									>
										{t("session.delete")}
									</button>
									<button
										type="button"
										className="acp-session-selector__confirm-no"
										onClick={(e) => {
											e.stopPropagation();
											setConfirmDelete(null);
										}}
									>
										{t("session.cancel")}
									</button>
								</>
							) : (
								<>
									<span className="acp-session-selector__item-label">
										{s.title || t("session.untitled")}
									</span>
									<span className="acp-session-selector__item-meta">
										{t("session.msgCount", s.messageCount)}
									</span>
									<button
										type="button"
										className="acp-session-selector__delete"
										onClick={(e) => handleDelete(e, s.id)}
										title={t("session.deleteSession")}
									>
										<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
											<path
												d="M4 4L12 12M12 4L4 12"
												stroke="currentColor"
												strokeWidth="1.5"
												strokeLinecap="round"
											/>
										</svg>
									</button>
								</>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
