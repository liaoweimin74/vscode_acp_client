## 1. 类型定义与消息协议

- [x] 1.1 在 `src/shared/types/extension.ts` 中新增 `FileAttachment` 类型（`{ path: string; type: "file" | "directory" }`），扩展 `WebviewMessage` 联合类型添加 `open_file_dialog`、`open_folder_dialog` 两种消息，扩展 `send_prompt` 消息添加可选 `attachments` 字段，扩展 `ExtensionMessage` 联合类型添加 `file_dialog_result` 消息
- [x] 1.2 在 `src/webview/store/useStore.ts` 中新增 `attachments` 状态（`FileAttachment[]`）、`addAttachment`、`removeAttachment`、`clearAttachments` actions，修改 `sendMessage` 将 attachments 传入 `send_prompt` 消息

## 2. Extension 端文件选择与 prompt 处理

- [x] 2.1 在 `SidebarProvider.ts` 的 `handleMessage` 中处理 `open_file_dialog` 和 `open_folder_dialog` 消息，调用 `vscode.window.showOpenDialog` 并通过 `bridge.postMessage` 回传 `file_dialog_result`
- [x] 2.2 修改 `SidebarProvider.ts` 的 `sendPrompt` 方法签名，接收可选 `attachments: FileAttachment[]` 参数，将附件传递给 `AgentConnection.prompt()`
- [x] 2.3 修改 `AgentConnection.ts` 的 `prompt()` 方法，接收可选 `attachments` 参数，根据 `PromptCapabilities` 构建 ContentBlock 数组（默认 `ResourceLink`，`embeddedContext` 启用时对文本文件使用 `EmbeddedResource`），替换当前硬编码的 `[{ type: "text", text: message }]`

## 3. Webview UI — +按钮与附件标签

- [x] 3.1 在 `ConfigBar.tsx` 中 RoleSelector 前面添加 `+` 图标按钮，点击后发送 `open_file_dialog` 消息，接收 `file_dialog_result` 后调用 `addAttachment`
- [x] 3.2 在 `PromptInput.tsx` 中添加附件标签渲染区域（输入框上方），显示 `attachments` 列表，每个标签显示文件名 + 删除按钮，hover 显示完整路径 tooltip
- [x] 3.3 添加附件标签的 CSS 样式（`PromptInput.css`），标签使用 chip 样式，与现有 UI 风格一致

## 4. @命令改造

- [x] 4.1 修改 `MentionMenu.tsx`，将工具类型（TOOL_KINDS）替换为 "Browse Files..." 和 "Browse Folders..." 选项，保留角色选择区域
- [x] 4.2 修改 `PromptInput.tsx` 中的 `mentionItems` 定义，移除 `TOOL_KINDS`，添加 `{ type: "action", action: "browse-files", name: "Browse Files...", description: "Attach files to prompt" }` 和 `{ type: "action", action: "browse-folders", name: "Browse Folders...", description: "Attach directories to prompt" }`
- [x] 4.3 修改 `handleMentionSelect` 回调，处理 `action` 类型选项时发送对应的 `open_file_dialog` / `open_folder_dialog` 消息
- [x] 4.4 更新 `MentionItem` 类型定义，支持 `action` 类型（`{ type: "action"; action: "browse-files" | "browse-folders"; name: string; description: string }`）

## 5. 构建与测试

- [x] 5.1 运行 `npm run build:all` 确保构建通过
- [x] 5.2 运行 `npm test` 确保现有测试通过
- [x] 5.3 修复因消息类型变更导致的测试失败（如有）
