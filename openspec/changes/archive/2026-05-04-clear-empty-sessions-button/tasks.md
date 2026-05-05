## 1. 类型定义

- [x] 1.1 在 `src/shared/types/extension.ts` 的 WebviewMessage 类型中新增 `clear_empty_sessions` 变体

## 2. Extension Host 处理

- [x] 2.1 在 `src/extension/StateManager.ts` 中新增 `removeEmptySessions()` 方法，删除所有空session并返回被删除的sessionId列表
- [x] 2.2 在 `src/extension/views/SidebarProvider.ts` 中处理 `clear_empty_sessions` 消息，调用 `removeEmptySessions()` 并对每个session执行closeSession + removeSession

## 3. Webview 实现

- [x] 3.1 在 `src/webview/store/useStore.ts` 中新增 `clearEmptySessions` action，发送消息并本地移除空session
- [x] 3.2 在 `src/webview/components/SessionSelector.tsx` 中新增"清除空Session"按钮，仅当存在空session时显示
- [x] 3.3 在 `src/webview/components/SessionSelector.css` 中添加按钮样式

## 4. 验证

- [x] 4.1 运行 `npm run build:all` 确保编译通过
- [x] 4.2 运行 `npm test` 确保测试通过
