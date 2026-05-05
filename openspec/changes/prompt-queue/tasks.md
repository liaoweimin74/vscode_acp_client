## 1. Store 层改动

- [x] 1.1 在 useStore 中新增 `sendQueuedPromptNow(index: number)` action：调用 `cancelPrompt()` 取消当前会话，然后从 `queuedPrompts` 中取出指定索引的提示词，通过 `postMessage` 发送 `send_prompt`，并从队列中移除该提示词
- [x] 1.2 修改 `cancelPrompt()` action：取消后不再清空 `queuedPrompts`（当前实现会清空），改为仅设置 `isStreaming: false`，保留队列数据

## 2. PromptInput 组件改动

- [x] 2.1 修改排队提示词渲染：每个排队项左侧保留 X 删除按钮，右侧新增向上箭头按钮（SVG 图标：向上箭头 ↑）
- [x] 2.2 向上箭头按钮点击事件：调用 `sendQueuedPromptNow(index)`
- [x] 2.3 调整 ESC 键处理逻辑：ESC 取消后若有排队提示词，自动发送第一条（与现有行为一致，确认 `cancelPrompt` 不再清空队列后逻辑正确）

## 3. 样式改动

- [x] 3.1 更新 `.acp-prompt__queue-item` 样式：调整布局使 X 按钮在左、文本在中间、向上箭头在右
- [x] 3.2 新增 `.acp-prompt__queue-send` 样式：向上箭头按钮样式，hover 时高亮提示

## 4. 验证

- [x] 4.1 构建验证：`npm run build:all` 通过
- [ ] 4.2 手动测试：流式响应期间发送消息 → 排队显示 → 点击箭头立即发送
- [ ] 4.3 手动测试：流式响应期间发送消息 → 等待完成 → 自动发送
- [ ] 4.4 手动测试：多条排队消息 → 点击非首条箭头 → 正确发送并保持其他排队
