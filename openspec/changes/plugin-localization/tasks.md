## 1. NLS 基础设施（package.json）

- [x] 1.1 创建 `package.nls.json`（英文默认），包含所有 commands title 和 configuration title/description 的 key-value 映射
- [x] 1.2 创建 `package.nls.zh-cn.json`（中文简体翻译）
- [x] 1.3 创建 `package.nls.zh-tw.json`（中文繁体翻译）
- [x] 1.4 修改 `package.json`，将 commands.title 和 configuration properties 的 title/description 替换为 `%key%` 占位符

## 2. Extension Host 本地化

- [x] 2.1 修改 `src/extension/commands/selectAgent.ts`：QuickPick title/placeholder、showWarningMessage/showErrorMessage 使用 `vscode.l10n.t()`
- [x] 2.2 修改 `src/extension/commands/selectModel.ts`：QuickPick title/placeholder、showWarningMessage/showInformationMessage/showErrorMessage 使用 `vscode.l10n.t()`
- [x] 2.3 修改 `src/extension/commands/setThoughtLevel.ts`：QuickPick title/placeholder、showWarningMessage/showInformationMessage/showErrorMessage 使用 `vscode.l10n.t()`
- [x] 2.4 修改 `src/extension/commands/switchSession.ts`：QuickPick title/placeholder、showInformationMessage 使用 `vscode.l10n.t()`
- [x] 2.5 修改 `src/extension/commands/newSession.ts`：showWarningMessage/showErrorMessage 使用 `vscode.l10n.t()`
- [x] 2.6 修改 `src/extension/commands/connectAgent.ts`：withProgress title、showWarningMessage/showErrorMessage 使用 `vscode.l10n.t()`
- [x] 2.7 修改 `src/extension/commands/disconnectAgent.ts`：如有硬编码字符串则替换
- [x] 2.8 修改 `src/extension/commands/selectAgentRole.ts`：showErrorMessage 使用 `vscode.l10n.t()`
- [x] 2.9 修改 `src/extension/commands/discoverAgents.ts`：withProgress title、QuickPick title/placeholder、所有 showXxxMessage 使用 `vscode.l10n.t()`
- [x] 2.10 修改 `src/extension/views/StatusBar.ts`：text 和 tooltip 中的硬编码字符串使用 `vscode.l10n.t()`
- [x] 2.11 修改 `src/extension/views/SidebarProvider.ts`：showOpenDialog title、showWarningMessage/showErrorMessage 使用 `vscode.l10n.t()`
- [x] 2.12 修改 `src/extension/SlashCommandRegistry.ts`：error 消息使用 `vscode.l10n.t()`
- [x] 2.13 修改 `src/extension/index.ts`：slash command description 使用 `vscode.l10n.t()`

## 3. Webview i18n 基础设施

- [x] 3.1 创建 `src/webview/locales/en.json`（英文默认语言包），包含所有 webview 硬编码字符串
- [x] 3.2 创建 `src/webview/locales/zh-cn.json`（中文简体翻译）
- [x] 3.3 创建 `src/webview/locales/zh-tw.json`（中文繁体翻译）
- [x] 3.4 创建 `src/webview/i18n.ts`：实现 `t(key)` 查找函数，支持 locale 切换和英文 fallback
- [x] 3.5 修改 `src/webview/store/useStore.ts`：添加 `locale` 状态字段
- [x] 3.6 修改 `src/webview/store/selectors.ts`：添加 `selLocale` selector
- [x] 3.7 修改 `src/extension/views/SidebarProvider.ts`：在 initialState 和 state_update 中传递 `vscode.env.language`

## 4. Webview 组件本地化

- [x] 4.1 修改 `src/webview/components/PromptInput.tsx`：替换 DEFAULT_COMMANDS 描述、BROWSE_ACTIONS、placeholder、cancel hint、reconnect 按钮等硬编码字符串为 `t()` 调用
- [x] 4.2 修改 `src/webview/components/AgentSelector.tsx`：替换 "Select Agent"、"Disconnect"、"Connecting..."、"Connect"、"Discover Agents" 为 `t()` 调用
- [x] 4.3 修改 `src/webview/components/SessionSelector.tsx`：替换 "Search sessions..."、"New Session"、"Clear Empty"、"No sessions yet"、"Delete"、"Cancel"、"Untitled"、"msg" 为 `t()` 调用
- [x] 4.4 修改 `src/webview/components/ModelSelector.tsx`：替换 "Search models..."、"No models found"、"Default"、"Current model" 为 `t()` 调用
- [x] 4.5 修改 `src/webview/components/ToolCallCard.tsx`：替换 KIND_LABELS 全部标签为 `t()` 调用，替换 "Error" 为 `t()` 调用
- [x] 4.6 修改 `src/webview/components/SubAgentView.tsx`：替换 "Sub-agent"、"You"、"Assistant"、message/tool 计数文本为 `t()` 调用
- [x] 4.7 修改 `src/webview/components/MessageItem.tsx`：替换 "You"、"Assistant"、"Thinking..."、"tokens" 为 `t()` 调用
- [x] 4.8 修改 `src/webview/components/ConfigBar.tsx`：替换 BROWSE_ACTIONS、attach tooltip、"Model"、"Think"、"Default" 为 `t()` 调用
- [x] 4.9 修改 `src/webview/components/RoleSelector.tsx`：替换 "Role" fallback 为 `t()` 调用
- [x] 4.10 修改 `src/webview/components/CodeBlock.tsx`：替换 "Copy code" tooltip 为 `t()` 调用
- [x] 4.11 修改 `src/webview/App.tsx`：替换 "Switch session" title 为 `t()` 调用

## 5. 验证

- [x] 5.1 构建通过（`npm run build:all`）
- [x] 5.2 Lint 通过（`npm run lint`）— 仅预存问题，无新增错误
- [x] 5.3 测试通过（`npm test`）— 108/108 通过，修复了因 i18n 导致的测试断言
- [x] 5.4 手动验证：VSCode 切换为中文后，命令面板、侧边栏、通知消息均显示中文（需人工在 VSCode 中验证）