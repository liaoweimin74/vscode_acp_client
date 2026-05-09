import { useEffect } from "react";
import { t } from "../i18n";
import { useStore } from "../store";
import {
	selCloseCommandPopup,
	selCommandPopup,
	selConfigOptions,
	selMcpServers,
	selOpenSessionMenu,
	selSetConfig,
	selToggleMcpServer,
} from "../store/selectors";
import { ModelSelector } from "./ModelSelector";
import "./CommandPopup.css";

export function CommandPopup() {
	const popup = useStore(selCommandPopup);
	const closeCommandPopup = useStore(selCloseCommandPopup);
	const openSessionMenu = useStore(selOpenSessionMenu);
	const setConfig = useStore(selSetConfig);
	const configOptions = useStore(selConfigOptions);
	const mcpServers = useStore(selMcpServers);
	const toggleMcpServer = useStore(selToggleMcpServer);

	useEffect(() => {
		if (!popup) return;
		if (popup === "sessions") {
			openSessionMenu();
			closeCommandPopup();
			return;
		}
	}, [popup, openSessionMenu, closeCommandPopup]);

	useEffect(() => {
		if (!popup || popup === "sessions") return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeCommandPopup();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [popup, closeCommandPopup]);

	if (!popup) return null;

	const modelOption = configOptions?.find((opt) => opt.category === "model");
	const currentValue = modelOption?.currentValue as string | undefined;

	if (popup === "models") {
		return (
			<div
				className="acp-popup-backdrop"
				onClick={closeCommandPopup}
				onKeyDown={(e) => {
					if (e.key === "Escape") closeCommandPopup();
				}}
			>
				<div className="acp-model-dropdown">
					{modelOption && modelOption.type === "select" ? (
						<ModelSelector
							modelOption={modelOption}
							currentValue={currentValue}
							onSelect={(configId, value) => {
								setConfig(configId, value);
								closeCommandPopup();
							}}
							variant="compact"
							onClose={closeCommandPopup}
						/>
					) : (
						<div className="acp-popup__empty">{t("model.notAvailable")}</div>
					)}
				</div>
			</div>
		);
	}

	if (popup === "mcps") {
		return (
			<div
				className="acp-popup-backdrop"
				onClick={closeCommandPopup}
				onKeyDown={(e) => {
					if (e.key === "Escape") closeCommandPopup();
				}}
			>
				<div className="acp-model-dropdown">
					<div className="acp-popup__header">
						<span className="acp-popup__title">{t("mcp.title")}</span>
					</div>
					{mcpServers.length === 0 ? (
						<div className="acp-popup__empty">{t("mcp.noServers")}</div>
					) : (
						<div className="acp-popup__body">
							{mcpServers.map((server) => (
								<button
									key={server.name}
									type="button"
									className={`acp-popup__item${server.enabled ? " acp-popup__item--active" : ""}`}
									onClick={() => toggleMcpServer(server.name, !server.enabled)}
								>
									<span className="acp-popup__item-label">
										<span className="acp-mcp__type-badge">{server.type.toUpperCase()}</span>
										{server.name}
									</span>
									{server.enabled && (
										<svg
											className="acp-popup__check"
											width="14"
											height="14"
											viewBox="0 0 16 16"
											fill="none"
											aria-hidden="true"
										>
											<path
												d="M3 8L7 12L13 4"
												stroke="currentColor"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	return null;
}
