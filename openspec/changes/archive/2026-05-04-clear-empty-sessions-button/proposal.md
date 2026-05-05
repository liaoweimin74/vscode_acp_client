## Why

用户在Session选择器中看到大量空session（未发过prompt的session），需要逐个手动删除，体验差。需要一键清除所有空session的功能。

## What Changes

- 在SessionSelector组件中新增"清除空Session"按钮
- 新增webview→extension的消息类型 `clear_empty_sessions`
- SidebarProvider处理该消息，调用StateManager获取空session列表并逐个close+remove
- 按钮仅在有空session时显示，点击后直接删除所有空session（无需二次确认）

## Capabilities

### New Capabilities
- `clear-empty-sessions`: 在Session选择器中提供一键清除所有空session的按钮及后端处理逻辑

### Modified Capabilities

## Impact

- `src/webview/components/SessionSelector.tsx`: 新增按钮UI
- `src/webview/components/SessionSelector.css`: 按钮样式
- `src/webview/store/useStore.ts`: 新增 `clearEmptySessions` action
- `src/shared/types/extension.ts`: WebviewMessage新增 `clear_empty_sessions` 类型
- `src/extension/views/SidebarProvider.ts`: 处理 `clear_empty_sessions` 消息
- `src/extension/StateManager.ts`: 新增 `removeEmptySessions()` 方法
