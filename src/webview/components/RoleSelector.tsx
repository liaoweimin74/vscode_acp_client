import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { useStore } from "../store";
import { selActiveRole, selAgentRoles, selSwitchRole } from "../store/selectors";
import "./RoleSelector.css";

export function RoleSelector() {
	const agentRoles = useStore(selAgentRoles);
	const activeRole = useStore(selActiveRole);
	const switchRole = useStore(selSwitchRole);

	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, []);

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open]);

	if (!agentRoles || agentRoles.length === 0) return null;

	const currentRole = agentRoles.find((r) => r.id === activeRole);

	const handleSelect = (roleId: string) => {
		switchRole(roleId);
		setOpen(false);
	};

	return (
		<div className="acp-role-selector" ref={ref}>
			<button type="button" className="acp-role-selector__btn" onClick={() => setOpen(!open)}>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
					<path
						d="M5 8L7 10L11 6"
						stroke="currentColor"
						strokeWidth="1.2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<span>{currentRole?.name ?? agentRoles[0]?.name ?? t("config.role")}</span>
			</button>
			{open && (
				<div className="acp-role-selector__menu">
					{agentRoles.map((role) => (
						<button
							key={role.id}
							type="button"
							className={`acp-role-selector__item ${role.id === activeRole ? "is-active" : ""}`}
							onClick={() => handleSelect(role.id)}
						>
							{role.name}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
