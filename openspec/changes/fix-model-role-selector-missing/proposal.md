## Why

连接 Agent 后，模型选择器和角色选择器不出现。根因是 `connectAgent` 流程中 `setActiveAgent` 先触发 `onDidChange` → `pushState`，此时 pending session 尚未创建，`pushState` 在 `activeSession=null` 且 `pendingSessionId=null` 的情况下向 webview 发送了 `configOptions=[]` 和 `agentRoles=[]` 的 state_update。后续 `setConfigOptions`/`update({ agentRoles })` 虽然设置了正确值，但 `pushState` 内部又重新调用 `setConfigOptions` 导致循环触发或覆盖，最终 webview 收到空数据。

## What Changes

- 在 `connectAgent` 和 `selectAgent` 中使用 `state.batch()` 将 `setActiveAgent`、`setConfigOptions`、`update({ agentRoles })` 合并为一次 `onDidChange` 触发，避免中间空状态被推送到 webview
- 修改 `SidebarProvider.pushState()` 逻辑：当 `activeSession=null` 但 state 已有 configOptions/agentRoles 时，不应覆盖为空
- 避免 `pushState` 内部再次调用 `setConfigOptions`/`update({ agentRoles })` 导致循环触发
- 确保 `newSession` 命令在清空旧状态后，能从新 session 正确恢复 configOptions 和 agentRoles

## Capabilities

### New Capabilities

- `state-batch-sync`: 确保 Agent 连接/切换时状态更新的原子性，避免中间空状态泄漏到 webview

### Modified Capabilities

## Impact

- `src/extension/commands/connectAgent.ts` — 使用 batch 合并状态更新
- `src/extension/commands/selectAgent.ts` — 同上
- `src/extension/views/SidebarProvider.ts` — pushState 逻辑修改，避免覆盖已有值
- `src/extension/commands/newSession.ts` — 确保清空后能正确恢复
- `src/extension/StateManager.ts` — 可能需要调整 batch 机制
