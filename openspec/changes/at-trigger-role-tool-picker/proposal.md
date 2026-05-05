## Why

用户在输入框中输入 `@` 时，需要快速访问角色（Roles）和工具（Slash Commands）的快捷选择。当前用户必须通过顶部按钮或 `/` 命令分别操作，缺乏统一的快速入口。`@` 触发器是聊天应用中广泛使用的交互模式，能显著提升操作效率。

## What Changes

- 在 PromptInput 中监听 `@` 字符输入，触发弹出选择框
- 新建 `AtMentionMenu` 组件，统一展示角色列表和工具（Slash Commands）列表
- 选择角色后自动插入 `@RoleName` 到输入框并切换角色
- 选择工具后自动插入 `/command ` 到输入框
- 支持 `@` 后输入文字进行模糊过滤
- 支持 ESC 关闭、上下箭头导航、Enter/Tab 确认选择
- 更新 Zustand store 添加 `atMentionOpen` 状态

## Capabilities

### New Capabilities
- `at-mention-menu`: `@` 触发的角色与工具快捷选择弹窗组件及交互逻辑

### Modified Capabilities

## Impact

- `src/webview/components/PromptInput.tsx` — 添加 `@` 输入检测逻辑
- `src/webview/components/AtMentionMenu.tsx` — 新建组件
- `src/webview/store/useStore.ts` — 添加 `atMentionOpen` 状态
- `src/webview/components/AtMentionMenu.css` — 新建样式
- `src/shared/types/extension.ts` — 无需修改（复用现有 AgentRole 和 slashCommands 类型）
