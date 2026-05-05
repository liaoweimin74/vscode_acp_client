import { useEffect } from "react";
import { useStore } from "../store";
import { selCommandPopup, selCloseCommandPopup, selOpenSessionMenu, selSetConfig, selConfigOptions } from "../store/selectors";
import { ModelSelector } from "./ModelSelector";
import "./CommandPopup.css";

export function CommandPopup() {
	const popup = useStore(selCommandPopup);
	const closeCommandPopup = useStore(selCloseCommandPopup);
	const openSessionMenu = useStore(selOpenSessionMenu);
	const setConfig = useStore(selSetConfig);
	const configOptions = useStore(selConfigOptions);

	useEffect(() => {
		if (!popup) return;
		if (popup === "sessions") {
			openSessionMenu();
			closeCommandPopup();
			return;
		}
	}, [popup, openSessionMenu, closeCommandPopup]);

	useEffect(() => {
		if (!popup || popup !== "models") return;
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
						<div className="acp-popup__empty">Model selection not available</div>
					)}
				</div>
			</div>
		);
	}

	return null;
}
