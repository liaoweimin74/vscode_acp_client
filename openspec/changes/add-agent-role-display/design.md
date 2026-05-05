## Context

ACP 协议通过 `setSessionMode` 支持切换代理角色/模式。`AgentConnection.ts` 已实现 `setSessionMode` 方法，`Session` 类型包含 `modes` 字段（`SessionModeState`）。但当前 UI 完全未暴露此能力。子代理（sub-agent）的对话内容也仅显示占位符。

## Goals / Non-Goals

**Goals:**
- 在底部 ConfigBar 中模型选择按钮前新增角色选择器，显示当前角色并支持切换
- 支持 `Ctrl+Tab` 快捷键快速轮换代理角色
- 子代理任务默认折叠，点击下拉箭头展开查看子代理的完整对话内容
- 通过 ACP `setSessionMode` 协议实现角色切换

**Non-Goals:**
- 不涉及代理管理（添加/删除/发现代理）
- 不涉及 ACP 协议扩展（复用现有 `modes`/`setSessionMode`）
- 不涉及持久化角色选择状态（重启后重置为默认角色）

## Decisions

1. **角色数据来源**: 使用 ACP 初始化时返回的 `SessionModeState`。`Session.modes` 字段包含可用角色列表，`AgentConnection.setSessionMode` 用于切换。
2. **UI 位置**: 角色选择器放置在 ConfigBar 中模型选择按钮之前（左侧），视觉上作为模型选择的"前缀"。
3. **Ctrl+Tab 快捷键**: 通过 `package.json` 的 `keybindings` 贡献点注册，切换角色时按角色列表顺序轮换。
4. **子代理对话展示**: `SubAgentView` 从占位符升级为接收真实子代理消息列表，默认折叠。使用 `<details>` HTML 元素实现折叠/展开。
5. **消息结构扩展**: `Message` 类型新增 `subAgentMessages?: Message[]` 字段，携带子代理的完整对话消息列表。

## Risks / Trade-offs

- [ACP mode 支持不一致] → 某些代理可能不返回 `modes` 或只返回单一角色。角色选择器应优雅降级（隐藏或禁用）。
- [Ctrl+Tab 与 VSCode 内置快捷键冲突] → VSCode 默认 `Ctrl+Tab` 用于切换编辑器 Tab。需确认通过 `when` 条件限定仅在 webview 聚焦时生效。
- [子代理消息量可能很大] → 默认折叠避免性能问题，展开时按需渲染。
