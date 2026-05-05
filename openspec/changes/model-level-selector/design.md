## Context

当前 ConfigBar 的模型选择器将所有模型选项平铺展示。ACP 协议的 `SessionConfigSelectOptions` 已支持两种结构：
- `Array<SessionConfigSelectOption>` — 无分组的平铺选项
- `Array<SessionConfigSelectGroup>` — 按 group 分组的选项（group + name + options[]）

现有 `flattenSelectOptions` 工具函数将分组结构展平，丢失了分组信息。需要利用分组信息实现模型合并与级别选择。

## Goals / Non-Goals

**Goals:**
- 利用 ACP 协议已有的 `SessionConfigSelectGroup` 结构，将同组模型合并为一个条目
- 在模型按钮右侧新增级别选择器，仅在有分组时显示
- 选择模型组时默认选中 "high" 级别（若存在），否则首个
- VSCode 命令面板的 selectModel 命令同步适配

**Non-Goals:**
- 不修改 ACP 协议或 SDK 类型
- 不改变 thought_level 选择器的行为
- 不实现模型级别的持久化记忆（每次切换模型组重置为默认级别）

## Decisions

### D1: 分组解析策略 — 保留原始分组结构

**选择**: 不再使用 `flattenSelectOptions` 展平模型选项，而是检测 `SessionConfigSelectOptions` 是否为分组结构，分别处理。

**理由**: ACP 协议已定义 `SessionConfigSelectGroup`，agent 端（如 opencode）已按组返回模型数据。展平会丢失分组语义。

**替代方案**: 在客户端自行按命名规则（如括号后缀）推断分组 → 脆弱，依赖命名约定，不可靠。

### D2: 级别选择器 UI — 独立下拉框

**选择**: 在模型按钮右侧新增一个小的级别选择下拉框，仅当当前模型属于分组选项时显示。

**理由**: 两步选择（先选模型系列，再选级别）符合用户心智模型，且不改变现有模型按钮的交互模式。

**替代方案**: 在模型下拉菜单中使用子菜单（二级菜单）→ webview 中实现复杂，且不符合现有 UI 模式。

### D3: 默认级别选择 — 优先 "high"

**选择**: 切换模型组时，按优先级选择级别：名称包含 "high" > 名称包含 "medium" > 首个选项。

**理由**: "high" 通常是用户最常用的级别，作为默认值减少操作步骤。

### D4: 无分组模型的兼容

**选择**: 无分组的模型选项（`Array<SessionConfigSelectOption>`）保持原样显示，不显示级别选择器。

**理由**: 向后兼容，不破坏现有行为。

## Risks / Trade-offs

- [Agent 未返回分组数据] → 降级为平铺显示，行为与当前一致
- [组内只有一个选项] → 仍显示级别选择器但只有一个选项，可接受
- [默认级别 "high" 不存在] → 降级选择首个选项，用户可手动切换
