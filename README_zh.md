# ACP - VSCode AI Agent 客户端

一个功能比较完备的vscode插件，通过 [Agent Client Protocol (ACP)](https://github.com/AcpProtocol/acp) 连接 AI 编码 CLI，实现AI代理编程。插件支持opencode,claude code,codex等支持acp协议的CLI工具。 
支持切换模型、Agent角色、查看子 Agent 上下文以及管理会话，一切尽在 VSCode 侧边栏。  
代码100%都是通过opencode CLI工具由ai 代理编程实现的。

## 功能特性

- **Agent 发现** — 从官方注册表浏览和安装 ACP 兼容的 Agent
- **Agent 选择器** — 连接任何 ACP 兼容的 CLI（OpenCode、Claude 等）
- **模型与思考级别切换** — 随时更改模型和思考深度
- **会话管理** — 创建、切换、恢复和关闭聊天会话
- **流式消息** — 实时消息流，支持 Markdown 和代码高亮
- **工具调用卡片** — 可展开的卡片，显示工具调用的参数和结果
- **子 Agent 视图** — 内联查看子 Agent 对话
- **斜杠命令** — `/model`、`/think`、`/agent`、`/clear`、`/help`

## 快速开始

### 前置条件

- VSCode 1.85+
- 已安装 ACP 兼容的 CLI（例如 [OpenCode](https://github.com/opencode-ai/opencode)）

### 安装

1. 手动加载 `.vsix` 文件(还未发布到VSCode 扩展市场)
2. 打开设置 → 搜索 `ACP`
3. 在 `vscodeAcp.agents` 中配置你的 Agent

### 配置

在 VSCode 设置中添加 Agent：

```json
{
  "vscodeAcp.agents": [
    {
      "id": "opencode",
      "name": "OpenCode",
      "command": "opencode",
      "args": ["acp"],
      "env": {}
    }
  ],
  "vscodeAcp.defaultAgent": "opencode"
}
```

### Agent 配置字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | Agent 的唯一标识符 |
| `name` | 是 | 界面中显示的名称 |
| `command` | 是 | 启动 Agent 的 CLI 命令 |
| `args` | 否 | 命令行参数 |
| `env` | 否 | 传递给进程的环境变量 |

### 支持的 Agent

#### OpenCode

[OpenCode](https://github.com/opencode-ai/opencode) 原生支持 ACP，通过 `acp` 子命令启动。

**前置条件**：安装 OpenCode（`npm install -g opencode-ai` 或从 [releases](https://github.com/opencode-ai/opencode/releases) 下载）

```json
{
  "vscodeAcp.agents": [
    {
      "id": "opencode",
      "name": "OpenCode",
      "command": "opencode",
      "args": ["acp"],
      "env": {}
    }
  ]
}
```

#### Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 需要通过 `@zed-industries/claude-code-acp` 适配器来支持 ACP。

**前置条件**：
1. 安装 Claude Code：`npm install -g @anthropic-ai/claude-code`
2. 完成认证：`claude setup-token`
3. 安装 ACP 适配器：`npm install -g @zed-industries/claude-code-acp`

```json
{
  "vscodeAcp.agents": [
    {
      "id": "claude",
      "name": "Claude Code",
      "command": "claude-code-acp",
      "args": [],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  ]
}
```

> **注意**：如果已通过 `claude setup-token` 完成认证，可以省略 `ANTHROPIC_API_KEY` 环境变量，适配器会使用已有的 Claude Code 会话。

#### Codex CLI

[Codex CLI](https://github.com/openai/codex) 需要通过 `codex-acp` 适配器来支持 ACP。

**前置条件**：
1. 从 [OpenAI](https://codex.openai.com) 安装 Codex CLI
2. 安装 ACP 适配器：按照 [cola-io/codex-acp](https://github.com/cola-io/codex-acp) 的说明操作

```json
{
  "vscodeAcp.agents": [
    {
      "id": "codex",
      "name": "Codex",
      "command": "codex-acp",
      "args": [],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  ]
}
```

#### Gemini CLI

Gemini CLI 原生支持 ACP，通过 `--acp` 参数启动。

**前置条件**：安装 Gemini CLI（按照 [Google 的说明](https://github.com/google-gemini/gemini-cli) 操作）

```json
{
  "vscodeAcp.agents": [
    {
      "id": "gemini",
      "name": "Gemini",
      "command": "gemini",
      "args": ["--acp"],
      "env": {}
    }
  ]
}
```

#### 配置多个 Agent

可以同时配置多个 Agent，在侧边栏中随时切换：

```json
{
  "vscodeAcp.agents": [
    {
      "id": "opencode",
      "name": "OpenCode",
      "command": "opencode",
      "args": ["acp"],
      "env": {}
    },
    {
      "id": "claude",
      "name": "Claude Code",
      "command": "claude-code-acp",
      "args": [],
      "env": {}
    },
    {
      "id": "codex",
      "name": "Codex",
      "command": "codex-acp",
      "args": [],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  ],
  "vscodeAcp.defaultAgent": "opencode"
}
```

## 使用方法

1. 从活动栏打开 **ACP Agent** 侧边栏
2. 从下拉菜单中选择一个 Agent（首次使用时自动连接）
3. 自动创建新会话
4. 输入消息并按 **Enter** 发送（**Shift+Enter** 换行）
5. 使用 **/** 前缀访问斜杠命令
6. 点击 **Model** 或 **Think** 按钮更改配置选项

### 命令

| 命令 | 说明 |
|------|------|
| `ACP: Discover Agents` | 从 ACP 注册表浏览和安装 Agent |
| `ACP: Select Agent` | 在已配置的 Agent 之间切换 |
| `ACP: New Session` | 创建新的聊天会话 |
| `ACP: Switch Session` | 切换到已有会话 |
| `ACP: Select Model` | 更改当前模型 |
| `ACP: Set Thought Level` | 调整思考深度 |
| `ACP: Open Settings` | 打开 ACP 设置 |

## 开发

```bash
# 安装依赖
npm install

# 构建扩展
npm run build

# 构建 webview
npm run build:webview

# 构建全部
npm run build:all

# 运行测试
npm test

# 监听模式（扩展）
npm run watch

# 监听模式（webview）
npm run watch:webview

# 代码检查
npm run lint

# 打包为 .vsix
npm run package
```

## 架构

```
src/
├── extension/       # VSCode 扩展宿主
│   ├── index.ts     # 激活、生命周期、连接
│   ├── StateManager.ts
│   ├── ConfigurationManager.ts
│   ├── WebviewBridge.ts
│   ├── commands/    # VSCode 命令
│   └── views/       # SidebarProvider, StatusBar
├── protocol/        # ACP 协议层
│   ├── AgentConnection.ts
│   └── AgentRegistry.ts
├── shared/          # 共享类型和工具
│   ├── types/
│   └── EventEmitter.ts
└── webview/         # React webview UI
    ├── api/         # VSCode API 桥接
    ├── store/       # Zustand 状态管理
    ├── components/  # React 组件
    └── App.tsx
```

## 许可证

MIT
