import type { MentionItem } from "@shared/types/extension";
import { flattenSelectOptions, getModelLevel, groupModelsByFamily } from "@shared/utils";
import { useEffect, useRef, useState } from "react";
import { postMessage } from "../api/vscode";
import { t } from "../i18n";
import { useStore } from "../store";
import {
	selActiveAgent,
	selActiveSession,
	selAgentRoles,
	selAgents,
	selConfigOptions,
	selMentionMenuOpen,
	selSetConfig,
	selSetMentionMenuOpen,
} from "../store/selectors";
import { MentionMenu } from "./MentionMenu";
import { ModelSelector } from "./ModelSelector";
import { RoleSelector } from "./RoleSelector";
import "./ConfigBar.css";

const BROWSE_ACTIONS: MentionItem[] = [
	{
		type: "action",
		action: "browse-files",
		name: t("mention.browseFiles"),
		description: t("mention.attachFiles"),
	},
	{
		type: "action",
		action: "browse-folders",
		name: t("mention.browseFolders"),
		description: t("mention.attachDirectories"),
	},
];

export function ConfigBar() {
	const setConfig = useStore(selSetConfig);
	const activeAgent = useStore(selActiveAgent);
	const activeSession = useStore(selActiveSession);
	const configOptions = useStore(selConfigOptions) ?? [];
	const agents = useStore(selAgents);
	const setMentionMenuOpen = useStore(selSetMentionMenuOpen);
	const mentionMenuOpen = useStore(selMentionMenuOpen);
	const agentRoles = useStore(selAgentRoles);

	const [showModelMenu, setShowModelMenu] = useState(false);
	const [showThinkMenu, setShowThinkMenu] = useState(false);
	const modelRef = useRef<HTMLDivElement>(null);
	const thinkRef = useRef<HTMLDivElement>(null);
	const attachRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!showThinkMenu) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") setShowThinkMenu(false);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [showThinkMenu]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
				setShowModelMenu(false);
			}
			if (thinkRef.current && !thinkRef.current.contains(e.target as Node)) {
				setShowThinkMenu(false);
			}
			if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
				setMentionMenuOpen(false);
			}
		};
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, [setMentionMenuOpen]);

	const connectedAgent = agents.find(
		(a) => a.config.id === activeAgent && a.status === "connected",
	);

	if (!connectedAgent) return null;

	const modelOption = configOptions.find((opt) => opt.category === "model");
	const thinkOption = configOptions.find((opt) => opt.category === "thought_level");

	const modelOptions =
		modelOption?.type === "select" ? flattenSelectOptions(modelOption.options) : [];
	const thinkOptions =
		thinkOption?.type === "select" ? flattenSelectOptions(thinkOption.options) : [];
	const modelGroups = modelOption?.type === "select" ? groupModelsByFamily(modelOptions) : [];

	const currentModel = modelOption?.currentValue as string | undefined;
	const currentThink = thinkOption?.currentValue as string | undefined;

	const currentModelOpt = modelOptions.find((m) => m.value === currentModel);
	const currentGroup = modelGroups.find((g) => g.options.some((o) => o.value === currentModel));
	const hasLevels = currentGroup && currentGroup.options.length > 1;

	const handleSelectThink = (value: string) => {
		if (thinkOption) setConfig(thinkOption.id, value);
		setShowThinkMenu(false);
	};

	const mentionItems: MentionItem[] = [
		...BROWSE_ACTIONS,
		...agentRoles.map((r) => ({
			type: "role" as const,
			id: r.id,
			name: r.name,
			description: r.description,
		})),
	];

	return (
		<div className="acp-config-bar">
			<div className="acp-config-bar__dropdown" ref={attachRef}>
				<button
					type="button"
					className="acp-config-bar__btn acp-config-bar__attach-btn"
					onClick={() => setMentionMenuOpen(!mentionMenuOpen)}
					title={t("mention.attachOrSwitchRole")}
					aria-label={t("mention.attachOrSwitchRole")}
				>
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path
							d="M8 3V13M3 8H13"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
				</button>
				{mentionMenuOpen && (
					<div className="acp-config-bar__menu">
						<MentionMenu
							items={mentionItems}
							query=""
							onSelect={(item) => {
								if (item.type === "action") {
									const canSelectFiles = item.action === "browse-files";
									const canSelectFolders = item.action === "browse-folders";
									postMessage({ type: "pick_files", canSelectFiles, canSelectFolders });
								} else if (item.type === "role") {
									useStore.getState().switchRole(item.id);
								}
								setMentionMenuOpen(false);
							}}
							onClose={() => setMentionMenuOpen(false)}
						/>
					</div>
				)}
			</div>
			<RoleSelector />
			{modelOption && modelOption.type === "select" && (
				<div className="acp-config-bar__dropdown" ref={modelRef}>
					<button
						type="button"
						className="acp-config-bar__btn"
						onClick={() => setShowModelMenu(!showModelMenu)}
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<text
								x="8"
								y="13"
								textAnchor="middle"
								fontSize="12"
								fontWeight="bold"
								fill="#e0a800"
								stroke="none"
							>
								M
							</text>
						</svg>
						<span>{currentGroup?.label || currentModelOpt?.name || t("model.model")}</span>
					</button>
					{hasLevels && (
						<div className="acp-config-bar__level-select-wrap">
							<button
								type="button"
								className="acp-config-bar__level-trigger"
								onClick={(e) => {
									e.stopPropagation();
									setShowModelMenu(!showModelMenu);
								}}
							>
								{(() => {
									const level = getModelLevel(currentModelOpt?.name ?? "");
									return level
										? level.charAt(0).toUpperCase() + level.slice(1)
										: t("model.default");
								})()}
							</button>
						</div>
					)}
					{showModelMenu && (
						<div className="acp-config-bar__menu">
							<ModelSelector
								modelOption={modelOption}
								currentValue={currentModel}
								onSelect={(configId, value) => setConfig(configId, value)}
								variant="compact"
								onClose={() => setShowModelMenu(false)}
							/>
						</div>
					)}
				</div>
			)}
			{thinkOption && (
				<div className="acp-config-bar__dropdown" ref={thinkRef}>
					<button
						type="button"
						className="acp-config-bar__btn"
						onClick={() => setShowThinkMenu(!showThinkMenu)}
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<path
								d="M2 4H14M2 8H14M2 12H10"
								stroke="currentColor"
								strokeWidth="1.2"
								strokeLinecap="round"
							/>
						</svg>
						<span>
							{thinkOptions.find((opt) => opt.value === currentThink)?.name || t("config.think")}
						</span>
					</button>
					{showThinkMenu && thinkOptions.length > 0 && (
						<div className="acp-config-bar__menu">
							{thinkOptions.map((opt) => (
								<button
									key={opt.value}
									type="button"
									className={`acp-config-bar__menu-item ${opt.value === currentThink ? "is-active" : ""}`}
									onClick={() => handleSelectThink(opt.value)}
								>
									{opt.name}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
