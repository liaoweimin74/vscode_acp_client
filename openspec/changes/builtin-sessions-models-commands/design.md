## Context

当前斜杠命令系统通过 `SlashCommandRegistry` 注册命令，所有命令的 `execute` 方法返回 `void`。`SidebarProvider` 在处理 `slash_command` 消息时，如果 `slashRegistry.execute()` 返回 `success: false`（命令未找到），则将命令文本作为 prompt 发送给 agent。这意味着所有未识别的命令都会被转发到 agent。

现有 `/model` 命令直接调用 `connection.setConfigOption()`，但需要用户输入精确的模型名称，体验不佳。缺少 `/sessions` 命令来快速切换会话。

## Goals / Non-Goals

**Goals:**
- `/sessions` 命令弹出 QuickPick 显示所有会话，用户选择后切换，切换前自动持久化当前会话
- `/models` 命令弹出 QuickPick 显示可用模型列表，用户选择后切换模型
- 内置命令执行成功后不 fallback 到 agent
- 保持现有 agent 命令转发机制不变

**Non-Goals:**
- 不改变现有 `/model`、`/think`、`/agent`、`/clear` 等命令的行为
- 不实现会话持久化的新存储机制（使用现有 StateManager 的 persist）
- 不实现模型列表的缓存机制

## Decisions

### 1. 内置命令通过 SlashCommandRegistry 的 builtin 标记区分

在 `SlashCommand` 接口中增加 `builtin?: boolean` 字段。内置命令标记为 `builtin: true`，执行成功后不 fallback 到 agent。

**替代方案**：维护单独的内置命令 Map — 增加维护成本，两套注册机制。

### 2. `/sessions` 使用 vscode.window.showQuickPick

复用 `switchSession` 命令的 QuickPick 模式，展示会话列表。切换前调用 `state.persist()` 确保当前状态已保存。

**替代方案**：在 webview 中渲染会话列表 — 需要额外的 webview 通信，增加复杂度。

### 3. `/models` 使用 vscode.window.showQuickPick

复用 `selectModel` 命令的 QuickPick 模式，展示模型列表。从当前 session 的 `configOptions` 中获取模型选项。

**替代方案**：在 webview 中渲染模型列表 — 同上，增加复杂度。

### 4. SlashCommandRegistry.execute 返回值扩展

在 `execute` 返回中增加 `builtin?: boolean` 字段，`SidebarProvider` 据此判断是否 fallback。

## Risks / Trade-offs

- [QuickPick 是模态窗口] → 用户需要关闭 QuickPick 才能继续操作，但这是 VSCode 命令的标准交互模式
- [内置命令与 agent 命令可能同名] → 内置命令优先，agent 命令被覆盖。文档中需说明
