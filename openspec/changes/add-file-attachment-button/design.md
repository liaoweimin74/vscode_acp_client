## Context

当前 vscode-acp 的提示词输入仅支持纯文本。用户若想让 agent 关注某个文件或目录，只能手动输入路径。ACP 协议的 `session/prompt` 请求支持 `ContentBlock` 数组，其中 `ResourceLink`（基线必须支持）和 `EmbeddedResource`（需 `embeddedContext` 能力）可用于传递文件上下文。当前 `AgentConnection.prompt()` 硬编码为 `[{ type: "text", text: message }]`，未利用多 ContentBlock 能力。

UI 层面：`ConfigBar` 中 `RoleSelector` 位于最左侧，`+` 按钮需在其前面。`PromptInput` 的 `@` 命令当前触发 `MentionMenu`（角色 + 工具选择），需改为文件/目录选择。附件选中后需在输入框上方显示标签。

## Goals / Non-Goals

**Goals:**
- 提供 `+` 按钮和 `@` 命令两种方式让用户选择文件/目录
- 选中文件/目录以标签形式显示，支持删除
- 利用 ACP `ResourceLink` / `EmbeddedResource` 将文件上下文传递给 agent
- 根据 agent 的 `PromptCapabilities` 自动选择最优 ContentBlock 类型

**Non-Goals:**
- 不实现文件内容预览（仅显示路径标签）
- 不实现图片文件的 `ImageContent` 上传（仅支持路径引用）
- 不修改 agent 端行为

## Decisions

### 1. 附件数据流：webview → extension → ACP

**选择**: webview 通过 `postMessage` 发送附件路径列表，extension 端 `SidebarProvider` 接收后构建 ContentBlock 数组。

**理由**: webview 无法直接访问文件系统，文件选择通过 `vscode.window.showOpenDialog` 在 extension 端完成。webview 仅负责 UI 展示和路径显示。

**替代方案**: webview 直接构建 ContentBlock — 不可行，webview 无法读取文件内容构建 `EmbeddedResource`。

### 2. 文件选择触发方式

**选择**: `+` 按钮点击 → extension 端调用 `vscode.window.showOpenDialog` → 返回选中路径 → webview 显示标签。`@` 命令改为弹出文件/目录选择菜单（分类：Files、Directories、Roles）。

**理由**: `+` 按钮是最直观的入口。`@` 命令改造为文件/目录选择符合用户对"附加上下文"的预期，同时保留角色选择。

**替代方案**: `@` 命令仅弹出文件浏览器 — 丢失角色选择功能，不兼容现有用法。

### 3. ContentBlock 类型选择策略

**选择**: 
- 默认使用 `ResourceLink`（`{ type: "resource_link", uri: "file:///path", name: "filename" }`）— ACP 基线要求所有 agent 必须支持
- 若 agent 的 `PromptCapabilities.embeddedContext` 为 true，对文本文件使用 `EmbeddedResource`（内嵌文件内容，减少 agent 端文件读取）

**理由**: `ResourceLink` 是 ACP 协议基线，所有 agent 必须支持。`EmbeddedResource` 需额外能力声明，但可避免 agent 端二次读取。

### 4. 附件标签 UI 位置

**选择**: 附件标签显示在 `PromptInput` 的输入框上方（`acp-prompt__input-wrap` 之前），类似聊天应用的附件预览区。

**理由**: 输入框上方是附件预览的常见位置，不干扰输入区域布局。

### 5. `@` 命令菜单改造

**选择**: `@` 命令弹出菜单分为两个区域：
- **Files & Folders**: 包含 "Browse Files..." 和 "Browse Folders..." 选项
- **Roles**: 保留现有角色选择

移除工具类型（TOOL_KINDS）选项。

**理由**: 工具类型选择在实际使用中价值不大（agent 自行决定使用什么工具），文件/目录附加是更实用的功能。

## Risks / Trade-offs

- [大文件内嵌风险] → 当 `embeddedContext` 启用时，大文件内嵌可能导致消息体积过大 → 限制单文件大小（如 1MB），超出则回退到 `ResourceLink`
- [目录引用粒度] → 目录路径作为 `ResourceLink` 传递，agent 需自行遍历 → 仅传递路径，agent 按需读取
- [向后兼容] → 修改 `@` 命令行为可能影响已习惯现有操作的用户 → 保留角色选择，仅替换工具选择部分
- [webview ↔ extension 通信] → 文件选择需跨 webview/extension 边界 → 使用 `postMessage` 请求/响应模式，extension 端调用 `showOpenDialog` 后将结果回传
