import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import "./SlashCommandMenu.css";

interface SlashCommand {
	name: string;
	description: string;
}

interface SlashCommandMenuProps {
	commands: SlashCommand[];
	query: string;
	onSelect: (command: string) => void;
	onClose: () => void;
}

export function SlashCommandMenu({ commands, query, onSelect, onClose }: SlashCommandMenuProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const menuRef = useRef<HTMLDivElement>(null);

	const filtered = commands.filter((c) =>
		c.name.toLowerCase().startsWith(query.toLowerCase()),
	);

	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

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
				onSelect(filtered[selectedIndex].name);
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

	return (
		<div className="acp-slash-menu" ref={menuRef} role="listbox">
			{filtered.map((cmd, i) => (
				<button
					key={cmd.name}
					type="button"
					className={`acp-slash-menu__item ${i === selectedIndex ? "acp-slash-menu__item--active" : ""}`}
					onClick={() => onSelect(cmd.name)}
					data-index={i}
					role="option"
					aria-selected={i === selectedIndex}
				>
					<span className="acp-slash-menu__name">{cmd.name}</span>
					<span className="acp-slash-menu__desc">{cmd.description}</span>
				</button>
			))}
		</div>
	);
}
