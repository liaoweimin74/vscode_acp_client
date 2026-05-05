## ADDED Requirements

### Requirement: Clear empty sessions button
系统 SHALL 在Session选择器中显示"清除空Session"按钮，仅当存在空session（messageCount===0）时显示。

#### Scenario: No empty sessions
- **WHEN** 所有session的messageCount > 0
- **THEN** "清除空Session"按钮不显示

#### Scenario: Has empty sessions
- **WHEN** 存在messageCount===0的session
- **THEN** "清除空Session"按钮显示，点击后删除所有空session

### Requirement: Clear empty sessions action
系统 SHALL 在webview store中提供 `clearEmptySessions` action，发送 `clear_empty_sessions` 消息到extension host。

#### Scenario: User clicks clear button
- **WHEN** 用户点击"清除空Session"按钮
- **THEN** webview发送 `clear_empty_sessions` 消息，本地立即从sessions列表中移除所有messageCount===0的session

### Requirement: Extension host handles clear empty sessions
系统 SHALL 在SidebarProvider中处理 `clear_empty_sessions` 消息，对每个空session调用ACP closeSession + StateManager.removeSession。

#### Scenario: Extension receives clear message
- **WHEN** SidebarProvider收到 `clear_empty_sessions` 消息
- **THEN** 获取所有空session ID，对每个调用 `connection.closeSession()` 和 `state.removeSession()`，如果当前活跃session被删除则自动新建session

### Requirement: WebviewMessage type extension
系统 SHALL 在WebviewMessage类型中新增 `clear_empty_sessions` 变体。

#### Scenario: Type checking
- **WHEN** 编译包含 `clear_empty_sessions` 消息类型的代码
- **THEN** TypeScript编译通过，无类型错误
