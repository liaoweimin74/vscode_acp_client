import type { SessionConfigOption } from "@shared/types/extension";
import {
	flattenSelectOptions,
	getModelLevel,
	groupModelsByFamily,
	isGroupedOptions,
} from "@shared/utils";
import type { ModelGroup, SelectGroup } from "@shared/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import "./ModelSelector.css";

interface ModelSelectorProps {
	modelOption: SessionConfigOption;
	currentValue: string | undefined;
	onSelect: (configId: string, value: string) => void;
	variant: "compact" | "full";
	onClose?: () => void;
}

interface FlatItem {
	value: string;
	label: string;
	group?: string;
}

export function ModelSelector({
	modelOption,
	currentValue,
	onSelect,
	variant,
	onClose,
}: ModelSelectorProps) {
	const selectOptions = modelOption.type === "select" ? modelOption.options : [];
	const flatOptions = flattenSelectOptions(selectOptions);
	const modelGroups: ModelGroup[] = isGroupedOptions(selectOptions)
		? (selectOptions as SelectGroup[]).map((g) => ({
				family: g.group,
				label: g.name,
				options: g.options,
				defaultValue: g.options[0]?.value,
			}))
		: groupModelsByFamily(flatOptions);
	const currentGroup = modelGroups.find((g) => g.options.some((o) => o.value === currentValue));

	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const allItems: FlatItem[] =
		modelGroups.length > 0
			? modelGroups.flatMap((g) =>
					g.options.map((o) => ({
						value: o.value,
						label:
							g.label +
							(g.options.length > 1 ? ` – ${getModelLevel(o.name) ?? t("model.default")}` : ""),
						group: g.family,
					})),
				)
			: flatOptions.map((o) => ({ value: o.value, label: o.name }));

	const filtered = query
		? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
		: allItems;

	const groupsToRender: ModelGroup[] = query
		? modelGroups
				.map((g) => ({
					...g,
					options: g.options.filter((o) => {
						const label =
							g.label + (g.options.length > 1 ? ` – ${getModelLevel(o.name) ?? ""}` : "");
						return label.toLowerCase().includes(query.toLowerCase());
					}),
				}))
				.filter((g) => g.options.length > 0)
		: modelGroups;

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
		(value: string) => {
			onSelect(modelOption.id, value);
			onClose?.();
		},
		[modelOption.id, onSelect, onClose],
	);

	const handleSelectFamily = useCallback(
		(group: ModelGroup) => {
			const target =
				group.options.find((o) => o.value === currentValue) ??
				group.options.find((o) => o.value === group.defaultValue) ??
				group.options[0];
			if (target) onSelect(modelOption.id, target.value);
			onClose?.();
		},
		[modelOption.id, currentValue, onSelect, onClose],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose?.();
				return;
			}
			const items = variant === "compact" ? groupsToRender : filtered;
			if (items.length === 0) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setActiveIndex((i) => (i + 1) % items.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIndex((i) => (i - 1 + items.length) % items.length);
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (variant === "compact" && modelGroups.length > 0) {
					const group = (items as ModelGroup[])[activeIndex];
					if (group) handleSelectFamily(group);
				} else {
					const item = (items as FlatItem[])[activeIndex];
					if (item) handleSelect(item.value);
				}
			}
		},
		[filtered, groupsToRender, activeIndex, variant, handleSelect, handleSelectFamily, onClose],
	);

	if (variant === "compact") {
		return (
			<div className="acp-model-selector">
				<div className="acp-model-selector__search">
					<svg
						width="12"
						height="12"
						viewBox="0 0 16 16"
						fill="none"
						className="acp-model-selector__search-icon"
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
						className="acp-model-selector__search-input"
						placeholder={t("model.searchModels")}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
					/>
				</div>
				{currentGroup &&
					currentGroup.options.length > 1 &&
					!query &&
					currentGroup.options.some((o) => getModelLevel(o.name)) && (
						<div className="acp-model-selector__levels">
							{currentGroup.options.map((opt) => {
								const level = getModelLevel(opt.name);
								const isActive = opt.value === currentValue;
								return (
									<button
										key={opt.value}
										type="button"
										className={`acp-model-selector__level-item ${isActive ? "is-active" : ""}`}
										onClick={() => handleSelect(opt.value)}
									>
										{level ? level.charAt(0).toUpperCase() + level.slice(1) : t("model.default")}
									</button>
								);
							})}
						</div>
					)}
				<div className="acp-model-selector__list" ref={listRef}>
					{groupsToRender.length === 0 && modelGroups.length === 0 && flatOptions.length > 0
						? filtered.map((item, i) => (
								<button
									key={item.value}
									type="button"
									className={`acp-model-selector__item acp-model-selector__item--flat ${item.value === currentValue ? "is-active" : ""} ${i === activeIndex ? "is-highlighted" : ""}`}
									onClick={() => handleSelect(item.value)}
									onMouseEnter={() => setActiveIndex(i)}
								>
									<span className="acp-model-selector__item-label">{item.label}</span>
								</button>
							))
						: groupsToRender.length === 0 && (
								<div className="acp-model-selector__empty">{t("model.noModelsFound")}</div>
							)}
					{modelGroups.length > 0 &&
						groupsToRender.map((group, i) => {
							const isActive = group.options.some((o) => o.value === currentValue);
							return (
								<button
									key={group.family}
									type="button"
									className={`acp-model-selector__item ${isActive ? "is-active" : ""} ${i === activeIndex ? "is-highlighted" : ""}`}
									onClick={() => handleSelectFamily(group)}
									onMouseEnter={() => setActiveIndex(i)}
								>
									<span className="acp-model-selector__item-label">{group.label}</span>
									{group.options.length > 1 && (
										<span className="acp-model-selector__item-count">{group.options.length}</span>
									)}
								</button>
							);
						})}
				</div>
			</div>
		);
	}

	return (
		<div className="acp-model-selector acp-model-selector--full">
			<div className="acp-model-selector__search">
				<svg
					width="12"
					height="12"
					viewBox="0 0 16 16"
					fill="none"
					className="acp-model-selector__search-icon"
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
					className="acp-model-selector__search-input"
					placeholder={t("model.searchModels")}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
			</div>
			<div className="acp-model-selector__list" ref={listRef}>
				{filtered.length === 0 && <div className="acp-model-selector__empty">No models found</div>}
				{modelGroups.length > 0
					? modelGroups.map((group) => {
							const groupFiltered = filtered.filter((f) => f.group === group.family);
							if (groupFiltered.length === 0) return null;
							return (
								<div key={group.family} className="acp-popup__group">
									<div className="acp-popup__group-label">{group.label}</div>
									{groupFiltered.map((item) => {
										const idx = filtered.indexOf(item);
										const level = getModelLevel(item.label);
										return (
											<button
												key={item.value}
												type="button"
												className={`acp-popup__item acp-popup__item--sub ${item.value === currentValue ? "acp-popup__item--active" : ""} ${idx === activeIndex ? "is-highlighted" : ""}`}
												onClick={() => handleSelect(item.value)}
												onMouseEnter={() => setActiveIndex(idx)}
											>
												<span className="acp-popup__item-label">
													{level ? level.charAt(0).toUpperCase() + level.slice(1) : item.label}
												</span>
												{item.value === currentValue && (
													<svg
														width="14"
														height="14"
														viewBox="0 0 16 16"
														fill="none"
														className="acp-popup__check"
														role="img"
														aria-label={t("model.currentModel")}
													>
														<path
															d="M3 8L6.5 11.5L13 4.5"
															stroke="currentColor"
															strokeWidth="1.5"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
													</svg>
												)}
											</button>
										);
									})}
								</div>
							);
						})
					: filtered.map((item, i) => (
							<button
								key={item.value}
								type="button"
								className={`acp-popup__item ${item.value === currentValue ? "acp-popup__item--active" : ""} ${i === activeIndex ? "is-highlighted" : ""}`}
								onClick={() => handleSelect(item.value)}
								onMouseEnter={() => setActiveIndex(i)}
							>
								<span className="acp-popup__item-label">{item.label}</span>
								{item.value === currentValue && (
									<svg
										width="14"
										height="14"
										viewBox="0 0 16 16"
										fill="none"
										className="acp-popup__check"
										role="img"
										aria-label={t("model.currentModel")}
									>
										<path
											d="M3 8L6.5 11.5L13 4.5"
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
		</div>
	);
}
