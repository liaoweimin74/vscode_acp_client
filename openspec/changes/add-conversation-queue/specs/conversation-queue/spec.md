## ADDED Requirements

### Requirement: Display queued prompts above input

系统 SHALL 在提示词输入框上方显示所有排队中的提示词列表。

#### Scenario: Show queued prompts when streaming
- **WHEN** 当前会话正在进行中（`isStreaming === true`）且用户发送了新消息
- **THEN** 该消息出现在输入框上方的排队列表中

#### Scenario: Hide queue when empty
- **WHEN** 排队列表为空（`queuedPrompts.length === 0`）
- **THEN** 排队区域不显示

### Requirement: Up arrow button to interrupt and send

每个排队项 SHALL 包含一个向上箭头按钮（↑），点击后中断当前会话并立即发送该提示词。

#### Scenario: Click arrow interrupts and sends
- **WHEN** 用户点击排队项中显示的向上箭头按钮
- **THEN** 系统调用 `cancelPrompt()` 中断当前会话，并从队列中移除该提示词，然后立即调用 `sendMessage(prompt)` 发送该提示词

#### Scenario: Arrow button disabled during sending
- **WHEN** 向上箭头被点击且系统正在处理发送
- **THEN** 箭头按钮处于禁用状态，防止重复点击

### Requirement: Auto-send on stream end

当上一轮会话完成时，系统 SHALL 自动发送排队中的第一个提示词（保持现有逻辑）。

#### Scenario: Auto-send after stream completes
- **WHEN** 当前会话完成（`stream_end` 事件）且排队列表不为空
- **THEN** 系统自动发送排队中的第一个提示词

### Requirement: Remove sent prompt from queue

提示词发出后 SHALL 从排队队列中移除。

#### Scenario: Prompt removed after sending
- **WHEN** 提示词被发送（无论手动点击箭头还是自动发送）
- **THEN** 该提示词从 `queuedPrompts` 数组中移除

#### Scenario: Prompt removed after interrupt-and-send
- **WHEN** 用户点击向上箭头触发中断并发送
- **THEN** 该提示词在发送前从队列中移除，避免重复发送
