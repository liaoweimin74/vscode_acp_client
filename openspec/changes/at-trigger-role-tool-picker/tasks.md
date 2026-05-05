## 1. Store 状态扩展

- [ ] 1.1 在 `useStore.ts` 的 UIState 接口中添加 `atMentionOpen: boolean` 状态
- [ ] 1.2 添加 `setAtMentionOpen(open: boolean)` action，打开时关闭 `isCommandMenuOpen`，反之在 `setCommandMenuOpen(true)` 时关闭 `atMentionOpen`
- [ ] 1.3 初始值 `atMentionOpen: false`

## 2. AtMentionMenu 组件

- [ ] 2.1 创建 `src/webview/components/AtMentionMenu.tsx`，接收 `query`（`@` 后的过滤文字）、`onSelectRole`、`onSelectTool`、`onClose` props
- [ ] 2.2 实现分组渲染：Roles 分组（来自 `agentRoles`）和 Tools 分组（来自 `slashCommands` + `DEFAULT_COMMANDS`）
- [ ] 2.3 实现模糊过滤：根据 `query` 过滤角色名和工具名（不区分大小写）
- [ ] 2.4 实现键盘导航：ArrowUp/ArrowDown 跨分组移动高亮，Enter/Tab 确认选择，Escape 关闭
- [ ] 2.5 实现点击外部关闭（Escape 键盘事件）
- [ ] 2.6 创建 `src/webview/components/AtMentionMenu.css` 样式，复用 SlashCommandMenu 的视觉风格，添加分组标题样式

## 3. PromptInput 集成

- [ ] 3.1 在 `handleChange` 中添加 `@` 检测：输入包含 `@` 且 `@` 后无空格时打开 AtMentionMenu
- [ ] 3.2 在 `handleChange` 中实现互斥：打开 AtMentionMenu 时关闭 SlashCommandMenu，打开 SlashCommandMenu 时关闭 AtMentionMenu
- [ ] 3.3 提取 `@` 后的过滤文字作为 `atMentionQuery`
- [ ] 3.4 实现 `handleAtSelectRole`：替换输入框中 `@query` 为 `@RoleName `，调用 `switchRole(roleId)`，关闭菜单
- [ ] 3.5 实现 `handleAtSelectTool`：替换输入框中 `@query` 为 `/command `，关闭菜单
- [ ] 3.6 在 PromptInput JSX 中渲染 AtMentionMenu（条件：`atMentionOpen && atMentionQuery`）

## 4. 验证

- [ ] 4.1 手动测试：输入 `@` 弹出菜单，选择角色后切换角色并插入标记
- [ ] 4.2 手动测试：输入 `@` 弹出菜单，选择工具后插入斜杠命令
- [ ] 4.3 手动测试：`@` 后输入文字过滤，键盘导航，ESC 关闭
- [ ] 4.4 手动测试：`@` 和 `/` 菜单互斥
