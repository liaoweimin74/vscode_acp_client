## Why

P1 级别的问题正在影响用户体验和代码可维护性：重复代码增加维护成本，空壳组件误导用户，Slash Commands 不执行降低可用性，缺少自动重连导致频繁手动操作，调试日志污染生产环境，代码高亮和 Markdown 渲染缺失使聊天体验粗糙。这些问题虽不阻塞基本功能，但显著降低了产品质量。

## What Changes

- 提取 `flattenSelectOptions` 为共享工具函数，消除 3 处重复定义
- 实现或移除 `SubAgentView` 空壳组件，避免误导用户
- 实现 Slash Commands 的实际执行逻辑（`/model`, `/think`, `/agent`, `/clear`）
- 添加 Agent 进程崩溃后的自动重连机制
- 用 VSCode `OutputChannel` 替代 `console.log`，加 log level 控制
- 为代码块添加语法高亮（使用 `highlight.js`）
- 完善 Markdown 渲染（标题、列表、粗体、链接、表格、行内代码）

## Capabilities

### New Capabilities
- `shared-utils`: 共享工具函数模块，消除跨层重复代码
- `slash-commands`: Slash Commands 解析与执行引擎
- `auto-reconnect`: Agent 进程自动重连机制
- `structured-logging`: 结构化日志系统（OutputChannel + log level）
- `syntax-highlighting`: 代码块语法高亮
- `markdown-rendering`: 完整 Markdown 渲染

### Modified Capabilities
<!-- 无现有 specs 需要修改 -->

## Impact

- **代码结构**: 新增 `src/shared/utils.ts` 共享模块；`src/extension/commands/` 下多个文件需重构引用
- **Webview 依赖**: 新增 `highlight.js` 依赖；`MessageItem.tsx` 和 `CodeBlock.tsx` 需重写渲染逻辑
- **Extension Host**: `AgentConnection.ts` 需添加重连逻辑和日志替换；`SidebarProvider.ts` 需处理 slash command 执行
- **组件变更**: `SubAgentView.tsx` 需实现或移除；`SlashCommandMenu.tsx` 需对接执行逻辑
- **依赖**: 新增 `highlight.js` npm 包
