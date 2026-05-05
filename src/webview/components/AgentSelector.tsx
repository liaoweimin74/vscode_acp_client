import { useEffect, useRef, useState } from "react";
import { postMessage } from "../api/vscode";
import { t } from "../i18n";
import { useStore } from "../store";
import { selActiveAgent, selAgents, selSelectAgent } from "../store/selectors";
import "./AgentSelector.css";

export function AgentSelector() {
	const agents = useStore(selAgents);
	const activeAgent = useStore(selActiveAgent);
	const selectAgent = useStore(selSelectAgent);
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

	const current = agents.find((a) => a.config.id === activeAgent);

	const handleToggle = (agentId: string) => {
		const agent = agents.find((a) => a.config.id === agentId);
		if (agent?.status === "connected") {
			postMessage({ type: "disconnect_agent" });
		} else if (agent?.status === "disconnected" || agent?.status === "error") {
			selectAgent(agentId);
		}
	};

	return (
		<div className="acp-agent-selector" ref={ref}>
			<button type="button" className="acp-agent-selector__trigger" onClick={() => setOpen(!open)}>
				<span
					className={`acp-agent-selector__dot acp-agent-selector__dot--${current?.status ?? "disconnected"}`}
				/>
				<span className="acp-agent-selector__label">
					{current?.config.name ?? t("agent.selectAgent")}
				</span>
				<svg
					className={`acp-agent-selector__chevron ${open ? "is-open" : ""}`}
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
				>
					<path
						d="M3 5L6 8L9 5"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>
			{open && (
				<div className="acp-agent-selector__menu">
					{agents.map((agent) => {
						const isActive = agent.status === "connected";
						const isConnecting = agent.status === "connecting";
						return (
							<div key={agent.config.id} className="acp-agent-selector__item">
								<span className="acp-agent-selector__item-name">{agent.config.name}</span>
								<button
									type="button"
									className={`acp-agent-selector__toggle ${isActive ? "is-on" : isConnecting ? "is-connecting" : "is-off"}`}
									onClick={() => handleToggle(agent.config.id)}
									title={
										isActive
											? t("agent.disconnect")
											: isConnecting
												? t("agent.connecting")
												: t("agent.connect")
									}
								>
									<span className="acp-agent-selector__toggle-track">
										<span className="acp-agent-selector__toggle-thumb" />
									</span>
								</button>
							</div>
						);
					})}
					<button
						type="button"
						className="acp-agent-selector__discover"
						onClick={() => {
							postMessage({ type: "discover_agents" });
							setOpen(false);
						}}
					>
						<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
							<path
								d="M8 3V13M3 8H13"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
						<span>{t("agent.discoverAgents")}</span>
					</button>
				</div>
			)}
		</div>
	);
}
