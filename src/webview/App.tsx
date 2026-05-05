import { useStore } from "./store";
import { AgentSelector } from "./components/AgentSelector";
import { PromptInput } from "./components/PromptInput";
import { ConfigBar } from "./components/ConfigBar";
import { MessageList } from "./components/MessageList";
import { CommandPopup } from "./components/CommandPopup";
import { SessionSelector } from "./components/SessionSelector";
import { useRef, useEffect } from "react";
import { selActiveAgent, selActiveSession, selMessages, selSessions, selSessionMenuOpen, selOpenSessionMenu, selCloseSessionMenu } from "./store/selectors";
import "./App.css";

export function App() {
	const activeAgent = useStore(selActiveAgent);
	const activeSession = useStore(selActiveSession);
	const messages = useStore(selMessages);
	const sessions = useStore(selSessions);
	const sessionMenuOpen = useStore(selSessionMenuOpen);
	const openSessionMenu = useStore(selOpenSessionMenu);
	const closeSessionMenu = useStore(selCloseSessionMenu);
	const currentSession = sessions.find((s) => s.id === activeSession);
	const sessionRef = useRef<HTMLDivElement>(null);
	const connected = !!activeAgent;
	const hasMessages = activeSession
		? (messages.get(activeSession)?.length ?? 0) > 0
		: (messages.get("__pending__")?.length ?? 0) > 0;

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (sessionRef.current && !sessionRef.current.contains(e.target as Node)) {
				closeSessionMenu();
			}
		};
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, [closeSessionMenu]);

	return (
		<div className="acp-app">
			<header className="acp-header">
				<AgentSelector />
				{connected && (
					<div className="acp-header__right" ref={sessionRef}>
						<button
							type="button"
							className="acp-session-btn"
							onClick={() => sessionMenuOpen ? closeSessionMenu() : openSessionMenu()}
							title="Switch session"
						>
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
								<text x="8" y="13" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#e0a800" stroke="none">S</text>
							</svg>
							<span className="acp-session-btn__label">{currentSession?.title || "Untitled"}</span>
						</button>
						{sessionMenuOpen && (
							<div className="acp-session-dropdown">
								<SessionSelector onClose={closeSessionMenu} />
							</div>
						)}
					</div>
				)}
			</header>

			<main className="acp-content">
			{connected && (activeSession || hasMessages) ? (
				<MessageList />
			) : (
				<div className="acp-content__empty">
					<p>{!connected ? "Connect to an agent to start" : "Type a message to start chatting"}</p>
				</div>
			)}
		</main>

			<footer className="acp-footer">
				<PromptInput />
				<ConfigBar />
			</footer>

			<CommandPopup />
		</div>
	);
}
