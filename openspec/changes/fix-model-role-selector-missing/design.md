## Context

当前 `connectAgent`/`selectAgent` 流程中，状态更新是分步执行的：

```
setActiveAgent → onDidChange → pushState → (configOptions=[], agentRoles=[])
createPendingSession → setConfigOptions → onDidChange → pushState → (重新从session获取，可能覆盖)
update({ agentRoles }) → onDidChange → pushState → (再次覆盖)
```

`pushState()` 内部调用 `state.batch()`，在其中又调用 `setConfigOptions`/`update({ agentRoles })`，这些调用在 batch 内部触发 `fireDidChange`，但 batch 会延迟到结束后统一触发。然而，`connectAgent` 本身不在 batch 中，所以 `setActiveAgent` 单独触发了一次 `onDidChange`，此时 `pushState` 被调用，而 pending session 还没创建，导致向 webview 发送了空数据。

## Goals / Non-Goals

**Goals:**
- 连接 Agent 后，webview 立即正确显示模型选择器和角色选择器
- 状态更新原子化，避免中间空状态泄漏到 webview
- `pushState` 不应覆盖已由命令层正确设置的 configOptions/agentRoles

**Non-Goals:**
- 不改变 ACP 协议本身
- 不改变 webview 端的 lazy mode 逻辑
- 不重构整个状态管理架构

## Decisions

### Decision 1: 在 connectAgent/selectAgent 中使用 state.batch() 包裹整个流程

**选择**: 将 `setActiveAgent`、`restoreSessions`、`createPendingSession`、`setConfigOptions`、`update({ agentRoles })` 全部放在同一个 `state.batch()` 中。

**理由**: `batch()` 会延迟 `onDidChange` 触发直到 batch 结束，确保 webview 只收到一次包含完整数据的 state_update。

**替代方案**: 在 `pushState` 中加条件判断不覆盖已有值 — 但这只是治标，中间空状态仍会被发送。

### Decision 2: pushState 中当 activeSession=null 且 activeAgent 有值时，不覆盖非空的 configOptions/agentRoles

**选择**: 在 `pushState` 的 `else if (activeAgent)` 分支中，仅当 state 中 configOptions/agentRoles 为空时才从 pending session 补充。

**理由**: 如果命令层已经通过 `setConfigOptions`/`update({ agentRoles })` 设置了值，`pushState` 不应该用 pending session 的数据（可能是相同引用但触发额外 fireDidChange）去覆盖。更重要的是，如果 pending session 已被 consume（pendingId=null），`pushState` 不应将值清空。

### Decision 3: newSession 命令清空状态后立即创建 pending session 并恢复 configOptions/agentRoles

**选择**: `newSession` 在清空 `activeSession`/`configOptions`/`agentRoles` 后，立即调用 `createPendingSession` 并用返回值恢复 configOptions 和 agentRoles，全部在同一个 batch 中完成。

**理由**: 当前 `newSession` 只清空不恢复，导致用户点"新建会话"后选择器消失，直到发送第一条消息才恢复。

## Risks / Trade-offs

- **[batch 中异步操作]** `restoreSessions` 和 `createPendingSession` 是异步的，`batch()` 只同步延迟 `fireDidChange`。如果异步操作在 batch 结束后才完成，中间状态仍会泄漏。→ 缓解：将 batch 拆分为两个阶段 — 第一阶段 batch 包裹 `setActiveAgent`（不触发 pushState），第二阶段在异步操作完成后用 batch 包裹 `setConfigOptions`/`update({ agentRoles })`。
- **[pushState 不覆盖]** 如果 configOptions 确实需要更新（如 agent 重新初始化），pushState 跳过覆盖可能导致过期数据。→ 缓解：只在 `activeSession=null` 时跳过，`activeSession` 有值时正常从 session 获取。