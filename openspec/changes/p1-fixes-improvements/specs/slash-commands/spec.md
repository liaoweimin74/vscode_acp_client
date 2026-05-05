## ADDED Requirements

### Requirement: Slash command parsing in webview
Webview SHALL 解析用户输入中的 slash command，格式为 `/command` 或 `/command args`。

#### Scenario: Command with arguments
- **WHEN** 用户输入 `/model gpt-4` 并发送
- **THEN** Webview 解析为 `{ type: "slash_command", command: "model", args: "gpt-4" }` 并通过 postMessage 发送到 Extension

#### Scenario: Command without arguments
- **WHEN** 用户输入 `/clear` 并发送
- **THEN** Webview 解析为 `{ type: "slash_command", command: "clear", args: "" }` 并通过 postMessage 发送到 Extension

#### Scenario: Regular message passthrough
- **WHEN** 用户输入不以 `/` 开头的普通消息
- **THEN** 按现有逻辑作为普通 prompt 发送，不触发 slash command 解析

### Requirement: Slash command execution in extension
Extension 端 SHALL 处理从 webview 发来的 slash command 消息并执行对应操作。

#### Scenario: /model command execution
- **WHEN** 收到 `{ command: "model", args: "gpt-4" }`
- **THEN** 调用 `connection.setConfigOption(sessionId, "model", "gpt-4")`

#### Scenario: /think command execution
- **WHEN** 收到 `{ command: "think", args: "high" }`
- **THEN** 调用 `connection.setConfigOption(sessionId, "thought_level", "high")`

#### Scenario: /agent command execution
- **WHEN** 收到 `{ command: "agent", args: "opencode" }`
- **THEN** 断开当前 agent，连接到指定 agent

#### Scenario: /clear command execution
- **WHEN** 收到 `{ command: "clear", args: "" }`
- **THEN** 通知 webview 清空当前 session 的消息列表

#### Scenario: Unknown command handling
- **WHEN** 收到未知的 slash command
- **THEN** 在 webview 显示错误提示 "Unknown command: /xxx"

### Requirement: Slash command registry
系统 SHALL 提供 `SlashCommandRegistry` 用于注册和管理 slash commands，便于扩展。

#### Scenario: Register new command
- **WHEN** 调用 `registry.register("model", { description, execute })`
- **THEN** 该命令可通过 `/model` 触发，出现在 SlashCommandMenu 列表中

#### Scenario: List available commands
- **WHEN** Webview 请求可用命令列表
- **THEN** 返回所有已注册命令的 name 和 description
