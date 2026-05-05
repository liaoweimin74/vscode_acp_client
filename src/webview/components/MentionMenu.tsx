import type { MentionItem } from "@shared/types/extension";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import "./MentionMenu.css";

interface MentionMenuProps {
	items: MentionItem[];
	query: string;
	onSelect: (item: MentionItem) => void;
	onClose: () => void;
}

export function MentionMenu({ items, query, onSelect, onClose }: MentionMenuProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const menuRef = useRef<HTMLDivElement>(null);

	const filtered = items.filter((item) => {
		const q = query.toLowerCase();
		return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset index when filtered list changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [filtered.length]);

	useEffect(() => {
		const item = menuRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
		item?.scrollIntoView({ block: "nearest" });
	}, [selectedIndex]);

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((i) => (i + 1) % filtered.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
		} else if (e.key === "Tab" || e.key === "Enter") {
			e.preventDefault();
			if (filtered[selectedIndex]) {
				onSelect(filtered[selectedIndex]);
			}
		} else if (e.key === "Escape") {
			onClose();
		}
	};

	useEffect(() => {
		const handler = handleKeyDown as unknown as EventListener;
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	});

	if (filtered.length === 0) return null;

	const actions = filtered.filter((i) => i.type === "action");
	const roles = filtered.filter((i) => i.type === "role");

	return (
		// biome-ignore lint/a11y/useSemanticElements: custom dropdown requires div+role for styling
		<div className="acp-mention-menu" ref={menuRef} role="listbox" tabIndex={-1}>
			{actions.length > 0 && (
				<div className="acp-mention-menu__section">
					<div className="acp-mention-menu__section-header">{t("mention.filesAndFolders")}</div>
					{actions.map((item) => {
						const globalIdx = filtered.indexOf(item);
						return (
							<button
								key={`action-${item.action}`}
								type="button"
								className={`acp-mention-menu__item ${globalIdx === selectedIndex ? "acp-mention-menu__item--active" : ""}`}
								onClick={() => onSelect(item)}
								data-index={globalIdx}
								aria-selected={globalIdx === selectedIndex}
							>
								<span className="acp-mention-menu__icon">
									{item.action === "browse-files" ? (
										<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
											<path d="M4 1h5l4 4v9H4V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
										</svg>
									) : (
										<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
											<path d="M1 3h5l2 2h7v9H1V3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
										</svg>
									)}
								</span>
								<span className="acp-mention-menu__name">{item.name}</span>
								{item.description && (
									<span className="acp-mention-menu__desc">{item.description}</span>
								)}
							</button>
						);
					})}
				</div>
			)}
			{roles.length > 0 && (
				<div className="acp-mention-menu__section">
					<div className="acp-mention-menu__section-header">{t("mention.roles")}</div>
					{roles.map((item) => {
						const globalIdx = filtered.indexOf(item);
						return (
							<button
								key={`role-${item.id}`}
								type="button"
								className={`acp-mention-menu__item ${globalIdx === selectedIndex ? "acp-mention-menu__item--active" : ""}`}
								onClick={() => onSelect(item)}
								data-index={globalIdx}
								aria-selected={globalIdx === selectedIndex}
							>
								<span className="acp-mention-menu__icon acp-mention-menu__icon--role">
									<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
										<circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
										<path
											d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"
											stroke="currentColor"
											strokeWidth="1.3"
											strokeLinecap="round"
										/>
									</svg>
								</span>
								<span className="acp-mention-menu__name">{item.name}</span>
								{item.description && (
									<span className="acp-mention-menu__desc">{item.description}</span>
								)}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
