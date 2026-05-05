## Context

当前Session选择器（SessionSelector组件）支持逐个删除session（点击X → 确认删除），但空session（未发过prompt的session）可能累积较多，逐个删除效率低。后端已有 `getEmptySessionIds()` 方法基于 `_promptedSessions` Set判断空session，`removeSession()` 和 `closeSession()` 已有完整的删除逻辑。

## Goals / Non-Goals

**Goals:**
- 在Session选择器中提供一键清除所有空session的按钮
- 点击后直接删除所有空session，无需二次确认
- 按钮仅在有空session时显示

**Non-Goals:**
- 不增加二次确认弹窗（用户明确要求直接删除）
- 不修改空session的判断逻辑（复用现有 `_promptedSessions` 机制）
- 不修改断开连接时的自动清除逻辑

## Decisions

1. **消息类型**: 新增 `clear_empty_sessions` WebviewMessage，由webview发送到extension host处理。复用现有webview→extension消息通道，与 `delete_session` 模式一致。

2. **批量删除逻辑**: 在StateManager新增 `removeEmptySessions()` 方法，返回被删除的sessionId列表。SidebarProvider遍历该列表，对每个session调用 `closeSession()` (ACP) + `removeSession()` (state)。复用现有单条删除逻辑而非新建批量删除，确保agent端也收到close通知。

3. **按钮位置**: 放在"New Session"按钮下方、session列表上方，与现有按钮样式一致。使用垃圾桶图标 + "Clear Empty Sessions"文字。

4. **空session计数**: webview端无法直接判断哪些session是空的（`_promptedSessions` 仅在extension host端）。方案：extension host在state_update中传递空session数量，或webview端通过 `messageCount === 0` 近似判断。选择后者——`messageCount` 已在SessionSummary中，空session的messageCount为0，足够准确且无需修改state结构。

## Risks / Trade-offs

- [messageCount===0 可能误删] → 空session定义是"未发过prompt"，而messageCount===0的session可能包含agent主动发的消息。但当前实现中空session确实没有消息，风险可接受。
- [批量删除无确认可能误操作] → 用户明确要求直接删除，且空session本身无有价值内容。
