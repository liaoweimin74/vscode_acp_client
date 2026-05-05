## Context

当前 ACP 扩展的 PromptInput 组件已支持 `/` 触发 SlashCommandMenu，用于快速选择斜杠命令。用户请求添加 `@` 触发器，在输入 `@` 时弹出角色（AgentRoles）和工具（SlashCommands）的统一选择框。

现有组件：
- `SlashCommandMenu` — `/` 触发的命令菜单，支持键盘导航和过滤
- `RoleSelector` — 顶栏角色选择下拉框
- `PromptInput` — 输入框，已有 `/` 检测逻辑和 `isCommandMenuOpen` 状态

## Goals / Non-Goals

**Goals:**
- 输入 `@` 时弹出统一选择框，展示角色和工具两个分组
- 支持模糊过滤、键盘导航、ESC 关闭
- 选择角色后切换角色并插入 `@RoleName` 到输入框
- 选择工具后插入 `/command ` 到输入框
- 复用现有 SlashCommandMenu 的交互模式（键盘导航、过滤逻辑）

**Non-Goals:**
- 不支持 `@` mention 多人/多角色（单次选择即关闭）
- 不修改 ACP 协议层
- 不修改 SidebarProvider 或 WebviewBridge 的消息协议

## Decisions

### 1. 新建 AtMentionMenu 组件 vs 扩展 SlashCommandMenu

**选择**: 新建 `AtMentionMenu` 组件

**理由**: SlashCommandMenu 是纯命令列表，AtMentionMenu 需要分组（角色/工具）和不同的选择行为（角色切换+插入 vs 命令插入），职责不同。复用交互模式但独立组件更清晰。

### 2. 状态管理：复用 `isCommandMenuOpen` vs 新增 `atMentionOpen`

**选择**: 在 Zustand store 中新增 `atMentionOpen: boolean` 状态

**理由**: `@` 菜单和 `/` 菜单互斥，但用同一个布尔值会导致逻辑混乱（需要区分哪个菜单打开）。新增独立状态，在打开一个时关闭另一个。

### 3. 角色选择行为

**选择**: 选择角色后调用 `switchRole(roleId)` 并在输入框插入 `@RoleName `

**理由**: 用户选择角色时既需要切换后端角色，也需要在输入框中留下可见标记，类似 Slack/Discord 的 mention 行为。

### 4. 过滤逻辑

**选择**: `@` 后的文字作为过滤词，同时匹配角色名和工具名

**理由**: 与 SlashCommandMenu 一致的过滤体验，用户输入 `@cod` 可以匹配 "Code" 角色或 "/code" 工具。

## Risks / Trade-offs

- [角色切换失败] → 选择角色后如果 `switchRole` 失败，输入框仍保留 `@RoleName`，用户可感知到角色未切换（通过 RoleSelector 状态）→ 可接受，与现有 RoleSelector 行为一致
- [与 `/` 菜单冲突] → 打开 `@` 菜单时自动关闭 `/` 菜单，反之亦然 → 在 handleChange 中互斥处理
- [角色列表为空] → 不显示角色分组，仅显示工具分组 → 降级体验但功能可用
