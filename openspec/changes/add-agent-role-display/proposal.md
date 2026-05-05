## Why

当前 VSACP 扩展仅支持切换不同的代理进程（Agent），但许多 ACP 代理（如 OpenCode）内部支持多种角色/模式（role/mode）。用户无法直观查看和切换代理内部角色，也无法展开查看子代理的具体对话内容，导致对代理行为控制力不足。

## What Changes

- 新增代理角色显示：在底部 ConfigBar 的模型选择按钮前，显示当前代理的角色/模式信息
- 新增代理角色列表下拉菜单：点击角色按钮可展开列表，点击切换角色
- 支持通过 `Ctrl+Tab` 快捷键快速切换代理角色
- 子代理（sub-agent）执行的任务默认折叠，可点击任务右侧的下拉箭头展开查看子代理的具体对话
- 扩展 `SessionModeState` 的使用，通过 ACP 协议的 `setSessionMode` 切换角色

## Capabilities

### New Capabilities
- `agent-role-ui`: 代理角色 UI 显示与切换（底部 ConfigBar 区域的角色选择器 + Ctrl+Tab 快捷键）
- `sub-agent-detail`: 子代理对话详情展开查看（折叠/展开子代理执行的任务内容）

### Modified Capabilities
- (无现有 spec 被修改)

## Impact

- `src/webview/components/ConfigBar.tsx` — 新增角色选择按钮和下拉菜单
- `src/webview/components/SubAgentView.tsx` — 从占位符升级为展示真实子代理对话
- `src/webview/store/useStore.ts` — 新增 `agentRoles`、`activeRole` 状态以及切换角色 action
- `src/webview/App.tsx` — 注册 Ctrl+Tab 键盘事件
- `src/extension/index.ts` — 注册 `vscodeAcp.selectAgentRole` 命令和快捷键
- `package.json` — 新增 `Ctrl+Tab` 快捷键绑定
- `src/extension/commands/` — 新增 `selectAgentRole.ts` 命令
- `src/shared/types/extension.ts` — 新增 `AgentRole` 类型、`ExtensionMessage` 新增角色更新消息类型
- `src/protocol/AgentConnection.ts` — 确保 `setSessionMode` 返回角色列表并触发事件
