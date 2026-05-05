## Why

当前用户在 AI 流式响应期间发送新消息时，消息会被加入排队队列，但队列中的消息仅显示为小标签，用户无法直观地控制其发送时机。用户需要一种更直观的排队体验：排队中的提示词应显示在输入框上方，带有向上箭头按钮可中断当前会话并立即发送，或在当前会话完成后自动发送。

## What Changes

- 重新设计排队提示词的 UI 展示方式：排队中的提示词显示在输入框上方，右侧显示向上箭头按钮
- 向上箭头按钮功能：点击后中断当前正在进行的会话，立即发送该排队提示词
- 自动发送机制：当前会话完成后，若用户未点击箭头，排队提示词自动发送
- 发送后从排队队列中移除
- 移除现有的排队项 X（删除）按钮，替换为向上箭头（立即发送）按钮
- ESC 取消逻辑调整：ESC 取消当前会话时，若有排队提示词，自动发送第一个排队提示词（保留现有行为）

## Capabilities

### New Capabilities
- `prompt-queue-ui`: 排队提示词的 UI 展示与交互，包括输入框上方显示排队提示词、向上箭头立即发送按钮、自动发送机制

### Modified Capabilities

## Impact

- `src/webview/components/PromptInput.tsx`: 排队提示词 UI 重写，X 按钮替换为向上箭头按钮
- `src/webview/components/PromptInput.css`: 排队提示词样式更新
- `src/webview/store/useStore.ts`: 新增 `sendQueuedPromptNow` action，修改 `cancelPrompt` 和 `stream_end` 处理逻辑
