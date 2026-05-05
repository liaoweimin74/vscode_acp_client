## Why

模型列表中同一系列模型（如 deepseek(low)、deepseek(high)、deepseek(max)）以独立条目展示，导致列表冗长、难以快速定位。用户需要先选模型系列，再选级别，当前 UI 无法支持这种两步选择。

## What Changes

- 将模型选项按 group 分组合并显示，组名作为模型名（如 "deepseek"），组内选项作为级别（如 low/high/max）
- 无 group 的模型保持原样显示
- 选择模型时默认选中该组的 "high" 级别（若存在），否则选第一个
- 在 ConfigBar 的模型按钮右侧新增级别选择下拉框，仅当当前模型属于有 group 的选项时显示
- 切换模型组时自动重置级别为默认（high 或首个）
- VSCode 命令 `vscodeAcp.selectModel` 同步适配分组逻辑

## Capabilities

### New Capabilities
- `model-group-merge`: 模型列表分组合并与级别选择 UI

### Modified Capabilities

## Impact

- `src/webview/components/ConfigBar.tsx` — 重构模型下拉菜单，新增级别选择器
- `src/webview/components/ConfigBar.css` — 级别选择器样式
- `src/shared/utils.ts` — 新增分组解析工具函数
- `src/extension/commands/selectModel.ts` — 适配分组选择逻辑
- `src/webview/store/useStore.ts` — 可能需要扩展状态以跟踪当前级别
