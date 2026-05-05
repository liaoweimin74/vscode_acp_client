## Why

当前vscode-acp在会话进行中（streaming）如果用户发送新消息，消息会被加入队列但不会立即发送。但用户无法手动中断当前会话来立即发送排队的消息——只能等待当前会话完成。用户需要能够主动中断上一轮会话，让排队的消息立即发出。

## What Changes

- **修改 PromptInput 排队UI**：在提示词输入框上方显示排队中的提示词，每个排队项右侧添加一个**向上箭头按钮**
- **新增中断并发送功能**：点击向上箭头时，中断当前正在进行的会话（`cancelPrompt`），然后立即发送该排队提示词
- **保持自动发送逻辑**：当上一轮会话完成时，排队的提示词按现有逻辑自动发出
- **队列管理**：会话发出后，该提示词从排队队列中移除

## Capabilities

### New Capabilities
- `conversation-queue`: 对话排队功能，包括排队UI显示、向上箭头中断按钮、中断并立即发送的交互逻辑

### Modified Capabilities
- (none)

## Impact

- **前端组件**: `src/webview/components/PromptInput.tsx` - 修改排队提示词UI，添加向上箭头按钮
- **前端状态管理**: `src/webview/store/useStore.ts` - 可能新增 `interruptAndSend(index)` 方法
- **样式**: `src/webview/components/PromptInput.css` - 添加向上箭头按钮样式
- **后端扩展**: 可能需要扩展 `SidebarProvider.ts` 的 `cancelPrompt` 逻辑以支持选择性发送
