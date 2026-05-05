## ADDED Requirements

### Requirement: Plus button for file/directory attachment
系统 SHALL 在角色选择器（RoleSelector）前面显示一个 `+` 图标按钮。点击该按钮 SHALL 弹出 VSCode 原生文件选择对话框，允许用户选择一个或多个文件或目录。选中的文件/目录 SHALL 以标签（chip）形式显示在提示词输入框上方。

#### Scenario: Click plus button to attach files
- **WHEN** 用户点击 `+` 按钮
- **THEN** 系统 SHALL 调用 `vscode.window.showOpenDialog`（`canSelectFiles: true`, `canSelectFolders: false`, `canSelectMany: true`）
- **AND** 用户选择文件并确认后，选中的文件路径 SHALL 显示为输入框上方的标签

#### Scenario: Click plus button to attach directories
- **WHEN** 用户点击 `+` 按钮并选择目录模式
- **THEN** 系统 SHALL 调用 `vscode.window.showOpenDialog`（`canSelectFiles: false`, `canSelectFolders: true`, `canSelectMany: true`）
- **AND** 用户选择目录并确认后，选中的目录路径 SHALL 显示为输入框上方的标签

#### Scenario: Remove attached file/directory
- **WHEN** 用户点击附件标签上的删除按钮
- **THEN** 该附件 SHALL 从附件列表中移除

#### Scenario: No agent connected
- **WHEN** 没有连接 agent
- **THEN** `+` 按钮 SHALL 不显示

### Requirement: At-command for file/directory selection
`@` 命令 SHALL 弹出菜单，包含 "Browse Files..."、 "Browse Folders..." 选项和角色列表。选择 "Browse Files..." 或 "Browse Folders..." SHALL 触发对应的文件/目录选择对话框。选择角色 SHALL 保持现有行为（插入 `@RoleName` 到输入框）。工具类型（TOOL_KINDS）选项 SHALL 被移除。

#### Scenario: Type @ to open file/directory menu
- **WHEN** 用户在输入框中输入 `@`
- **THEN** 系统 SHALL 显示菜单，包含 "Browse Files..."、"Browse Folders..." 选项和角色列表

#### Scenario: Select Browse Files from @ menu
- **WHEN** 用户从 `@` 菜单中选择 "Browse Files..."
- **THEN** 系统 SHALL 调用 `vscode.window.showOpenDialog`（文件模式，多选）
- **AND** 选中的文件 SHALL 添加为附件标签

#### Scenario: Select Browse Folders from @ menu
- **WHEN** 用户从 `@` 菜单中选择 "Browse Folders..."
- **THEN** 系统 SHALL 调用 `vscode.window.showOpenDialog`（目录模式，多选）
- **AND** 选中的目录 SHALL 添加为附件标签

#### Scenario: Select role from @ menu
- **WHEN** 用户从 `@` 菜单中选择一个角色
- **THEN** 系统 SHALL 插入 `@RoleName` 到输入框（保持现有行为）

### Requirement: Attachment display in prompt area
附件标签 SHALL 显示在提示词输入框上方。每个标签 SHALL 显示文件/目录名称，并带有删除按钮。标签样式 SHALL 与现有 UI 风格一致。

#### Scenario: Display multiple attachments
- **WHEN** 用户附加了多个文件和目录
- **THEN** 所有附件 SHALL 以标签形式水平排列显示在输入框上方
- **AND** 每个标签 SHALL 显示文件/目录名称（非完整路径）

#### Scenario: Attachment tag hover
- **WHEN** 用户将鼠标悬停在附件标签上
- **THEN** 标签 SHALL 显示完整路径的 tooltip

### Requirement: Send attachments with prompt
发送提示词时，附件 SHALL 随消息一起发送给 agent。系统 SHALL 根据 agent 的 `PromptCapabilities` 选择 ContentBlock 类型。

#### Scenario: Send prompt with file attachments
- **WHEN** 用户在有附件的情况下发送提示词
- **THEN** 系统 SHALL 构建包含文本和附件的 ContentBlock 数组
- **AND** 文件附件 SHALL 以 `ResourceLink` 形式包含在 prompt 请求中（`{ type: "resource_link", uri: "file:///path", name: "filename" }`）

#### Scenario: Agent supports embeddedContext
- **WHEN** agent 的 `PromptCapabilities.embeddedContext` 为 true
- **AND** 用户发送提示词时附带文本文件
- **THEN** 系统 SHALL 对小于 1MB 的文本文件使用 `EmbeddedResource`（内嵌文件内容）
- **AND** 对大于 1MB 的文件回退到 `ResourceLink`

#### Scenario: Agent does not support embeddedContext
- **WHEN** agent 的 `PromptCapabilities.embeddedContext` 为 false 或未定义
- **THEN** 所有附件 SHALL 使用 `ResourceLink`

#### Scenario: Clear attachments after send
- **WHEN** 提示词发送成功
- **THEN** 附件列表 SHALL 被清空

### Requirement: Webview message protocol extension
`send_prompt` 消息 SHALL 支持可选的 `attachments` 字段，包含文件/目录路径列表。新增 `open_file_dialog` 和 `open_folder_dialog` 消息类型用于 webview 请求 extension 端打开文件选择对话框。

#### Scenario: Send prompt with attachments
- **WHEN** webview 发送 `send_prompt` 消息
- **THEN** 消息格式 SHALL 为 `{ type: "send_prompt", sessionId, prompt, attachments?: FileAttachment[] }`
- **AND** `FileAttachment` 类型 SHALL 为 `{ path: string; type: "file" | "directory" }`

#### Scenario: Request file dialog from webview
- **WHEN** webview 发送 `{ type: "open_file_dialog" }` 消息
- **THEN** extension 端 SHALL 调用 `vscode.window.showOpenDialog` 并将结果通过 `{ type: "file_dialog_result", paths: string[] }` 回传

#### Scenario: Request folder dialog from webview
- **WHEN** webview 发送 `{ type: "open_folder_dialog" }` 消息
- **THEN** extension 端 SHALL 调用 `vscode.window.showOpenDialog`（目录模式）并将结果回传
