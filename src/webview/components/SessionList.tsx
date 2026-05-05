import { useStore } from "../store";
import { selSessions, selActiveSession } from "../store/selectors";
import { t } from "../i18n";
import "./SessionList.css";

export function SessionList() {
	const sessions = useStore(selSessions);
	const activeSession = useStore(selActiveSession);

	if (sessions.length === 0) return null;

	const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

	return (
		<div className="acp-session-list">
			{sorted.map((session) => (
				<button
					key={session.id}
					type="button"
					className={`acp-session-list__item ${session.id === activeSession ? "acp-session-list__item--active" : ""}`}
					onClick={() => {
						useStore.getState().switchSession(session.id);
					}}
				>
					<span className="acp-session-list__title">{session.title || t("session.untitled")}</span>
					<span className="acp-session-list__meta">
						{t("session.msgCount", session.messageCount)}
					</span>
				</button>
			))}
		</div>
	);
}
