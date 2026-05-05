## ADDED Requirements

### Requirement: Automatic reconnection on process crash
Agent 进程异常退出后，系统 SHALL 自动尝试重连，采用指数退避策略。

#### Scenario: Process exits with error code
- **WHEN** Agent 进程以非零退出码退出
- **THEN** 系统在 1 秒后自动尝试重连，重连时重新调用 `connect()` + `initialize()`

#### Scenario: Exponential backoff on repeated failures
- **WHEN** 第一次重连失败
- **THEN** 等待 2 秒后第二次重连；再失败等待 4 秒后第三次重连

#### Scenario: Maximum retry limit
- **WHEN** 连续 3 次重连失败
- **THEN** 停止重试，向 webview 发送错误通知，显示 "Agent connection lost. Click to reconnect." 按钮

#### Scenario: User disconnect cancels reconnection
- **WHEN** 用户在重连过程中手动断开 agent
- **THEN** 取消所有待执行的重连尝试

#### Scenario: Successful reconnection
- **WHEN** 重连成功
- **THEN** 自动创建新 session，通知 webview 更新 agent 状态为 connected，清空旧 session 数据

### Requirement: Reconnection state notification
系统 SHALL 在重连过程中通知 webview 当前状态。

#### Scenario: Reconnecting notification
- **WHEN** 开始自动重连
- **THEN** 向 webview 发送 `{ type: "agent_reconnecting", attempt: N }` 消息

#### Scenario: Reconnection failed notification
- **WHEN** 所有重连尝试失败
- **THEN** 向 webview 发送 `{ type: "agent_reconnect_failed" }` 消息
