## Why

当前 `/model` 和 `/think` 等斜杠命令直接将参数发送给 agent，用户需要知道确切的模型名称或思维等级值才能使用。缺少 `/sessions` 和 `/models` 两个内置命令：`/sessions` 应弹出会话列表供用户切换，`/models` 应弹出模型列表供用户选择。这两个命令是客户端内置行为，不应发送到 agent，而应由扩展本地处理。

## What Changes

- 新增内置斜杠命令 `/sessions`：弹出 QuickPick 显示所有会话，用户选择后切换到目标会话；切换前自动持久化当前会话对话
- 新增内置斜杠命令 `/models`：弹出 QuickPick 显示当前会话可用模型列表，用户选择后切换模型
- 区分"内置命令"和"agent 命令"：内置命令由扩展本地处理，不发送到 agent；未识别的命令才 fallback 到 agent
- 现有 `/model` 命令改为 `/models`（弹出列表），保留 `/model <name>` 作为快捷设置方式

## Capabilities

### New Capabilities
- `builtin-commands`: 内置斜杠命令机制，区分本地处理与 agent 转发，包含 `/sessions` 和 `/models` 两个内置命令的实现

### Modified Capabilities

## Impact

- `src/extension/SlashCommandRegistry.ts`：需支持"内置命令"标记，内置命令执行成功后不 fallback 到 agent
- `src/extension/index.ts`：注册 `/sessions` 和 `/models` 内置命令
- `src/extension/views/SidebarProvider.ts`：`slash_command` 处理逻辑需区分内置命令和 agent 命令
- `src/extension/StateManager.ts`：会话切换时可能需要持久化逻辑
