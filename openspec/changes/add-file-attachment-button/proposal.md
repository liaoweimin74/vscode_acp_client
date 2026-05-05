## Why

用户在提示词中添加文件或目录上下文时，只能手动输入路径，体验差且容易出错。当前 `@` 命令仅用于选择角色和工具类型，未提供文件/目录选择功能。需要增加一个可视化的文件附加按钮，并将 `@` 命令扩展为支持文件/目录选择，利用 ACP 协议的 `ResourceLink` 和 `EmbeddedResource` ContentBlock 将文件上下文传递给 agent。

## What Changes

- 在角色选择器（RoleSelector）前面增加一个 `+` 图标按钮，点击后弹出文件/目录选择器
- 选中的文件/目录以标签（chip）形式显示在输入框上方，可单独删除
- 将 `@` 命令的功能从"选择角色和工具"改为"选择文件/目录"，保留角色选择但替换工具选择为文件/目录浏览
- 修改 `send_prompt` 消息格式，支持携带附件列表（文件/目录路径）
- 修改 `AgentConnection.prompt()` 方法，将附件转换为 ACP `ContentBlock`（`ResourceLink` 或 `EmbeddedResource`）随 prompt 一起发送
- 检查 agent 的 `PromptCapabilities`（`embeddedContext`、`image`）决定使用 `ResourceLink` 还是 `EmbeddedResource`

## Capabilities

### New Capabilities
- `file-attachment`: 文件/目录附加功能——UI 交互（+按钮、@命令、附件标签）、消息协议扩展、ACP ContentBlock 转换

### Modified Capabilities

## Impact

- **前端组件**: `PromptInput.tsx`（+按钮、附件标签渲染）、`ConfigBar.tsx`（+按钮位置）、`MentionMenu.tsx`（@命令改为文件/目录选择）
- **消息协议**: `WebviewMessage` 类型新增 `attachments` 字段，`send_prompt` 消息扩展
- **扩展端**: `SidebarProvider.ts` 的 `sendPrompt()` 方法需处理附件，`AgentConnection.ts` 的 `prompt()` 方法需构建多 ContentBlock 请求
- **类型**: `extension.ts` 新增 `FileAttachment` 类型
- **ACP 协议**: 利用 `PromptCapabilities` 判断 agent 支持的 ContentBlock 类型，使用 `ResourceLink`（基线支持）或 `EmbeddedResource`（需 `embeddedContext` 能力）
