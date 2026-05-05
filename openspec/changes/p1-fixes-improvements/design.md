## Context

vscode-acp 是一个 VSCode 扩展，通过 ACP 协议连接 AI Agent CLI，在侧边栏提供聊天界面。当前代码存在 7 个 P1 级别问题：重复代码、空壳组件、Slash Commands 不执行、无自动重连、调试日志污染、无语法高亮、Markdown 渲染不完整。

架构分层：
```
Extension Host (Node.js)  ←→  Webview (React + Zustand)
     │                              │
  AgentConnection              useStore
  SidebarProvider              Components
  Commands                     CSS
```

Extension Host 和 Webview 通过 `postMessage` 通信，类型定义在 `src/shared/`。

## Goals / Non-Goals

**Goals:**
- 消除跨层重复代码，建立共享工具模块
- 实现 Slash Commands 的解析与执行
- 添加 Agent 进程自动重连
- 用 OutputChannel 替代 console.log
- 为代码块添加语法高亮
- 完善 Markdown 渲染
- 处理 SubAgentView 空壳问题

**Non-Goals:**
- 不重构消息系统（P0 范畴）
- 不添加消息编辑/重新生成功能（P2）
- 不修改 ACP 协议层
- 不添加 E2E 测试框架

## Decisions

### D1: 共享工具模块位置 — `src/shared/utils.ts`

**选择**: 在 `src/shared/` 下新建 `utils.ts`
**替代方案**: (A) 每个消费者各自 import 原始类型做转换 (B) 放在 `src/protocol/` 下
**理由**: `src/shared/` 已是 Extension 和 Webview 共享的类型层，工具函数放这里最自然。`flattenSelectOptions` 的输入类型来自 `@agentclientprotocol/sdk` 和 `@shared/types/acp`，放在 shared 可以统一类型入口。

### D2: Slash Commands 执行位置 — Webview 端解析 + Extension 端执行

**选择**: Webview 解析 `/command args` 格式 → 通过 `postMessage` 发送结构化命令 → Extension 端执行
**替代方案**: (A) 全部在 Webview 端执行 (B) 全部在 Extension 端解析
**理由**: Webview 知道用户输入内容，适合解析；Extension 端有 `AgentConnection` 和 VSCode API 访问权，适合执行。分层清晰。

```
用户输入 "/model gpt-4"
     │
     ▼
Webview 解析 → { type: "slash_command", command: "model", args: "gpt-4" }
     │
     ▼ postMessage
Extension SidebarProvider.handleSlashCommand()
     │
     ▼
connection.setConfigOption(sessionId, "model", "gpt-4")
```

### D3: 自动重连策略 — 指数退避 + 最大重试

**选择**: 进程崩溃后自动重连，指数退避（1s, 2s, 4s, 8s），最多 3 次
**替代方案**: (A) 立即重连 (B) 仅显示重连按钮
**理由**: 指数退避避免对 agent 进程造成压力；3 次上限防止无限重试；重连时需重新 `initialize`，之前的 session 会丢失（ACP 协议限制），需通知用户。

### D4: 日志系统 — Logger 类 + OutputChannel

**选择**: 创建 `Logger` 单例，内部使用 `vscode.window.createOutputChannel`，支持 `debug/info/warn/error` 四级
**替代方案**: (A) 直接用 `vscode.window.createOutputChannel` (B) 第三方日志库
**理由**: 封装 Logger 类便于统一格式、控制级别、未来扩展。不引入第三方依赖。

### D5: 语法高亮 — highlight.js

**选择**: 使用 `highlight.js` 自动语言检测
**替代方案**: (A) shiki (B) Prism.js
**理由**: highlight.js 体积适中（核心 ~40KB gzip），自动检测语言适合聊天场景（代码块语言标签可能缺失或不准确），与 React 集成简单。shiki 需要 WASM 且体积大，Prism 需要手动注册语言。

### D6: Markdown 渲染 — react-markdown

**选择**: 使用 `react-markdown` + `remark-gfm` 插件
**替代方案**: (A) 手写解析器 (B) marked + dangerouslySetInnerHTML
**理由**: react-markdown 是 React 生态标准方案，组件化渲染便于自定义（代码块用 CodeBlock 组件），remark-gfm 支持 GFM 表格/删除线等。避免 XSS 风险（不用 dangerouslySetInnerHTML）。

### D7: SubAgentView — 保留组件但显示 "not available" 提示

**选择**: 保留组件结构，将 "loading..." 替换为 "Sub-agent conversations are not yet supported" 提示
**替代方案**: (A) 完全移除组件 (B) 实现完整子代理视图
**理由**: 完全移除会破坏 MessageItem 的引用；完整实现需要 ACP 协议支持子代理消息获取（当前协议不支持）。保留组件但明确提示状态最务实。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| highlight.js 增加打包体积 | 使用 `highlight.js/lib/core` + 按需注册语言，控制体积 |
| react-markdown 依赖链较深 | 锁定版本，评估打包体积影响 |
| 自动重连时旧 session 丢失 | 重连后通知 webview 清空旧 session，自动创建新 session |
| Slash Commands 扩展性 | 定义 `SlashCommandRegistry` 接口，便于未来添加新命令 |
| Logger 在 webview 端不可用 | Webview 端保留 `console.log`，Logger 仅用于 Extension Host |
