## Context

当前 `discoverAgents` 命令（`src/extension/commands/discoverAgents.ts`）实现了完整的"发现→下载→安装→配置→连接"流程。对于 npx/uvx 分发的 agent，下载步骤是多余的——npx/uvx 会在首次运行时自动拉取包。对于 binary 分发，下载步骤虽然有用，但增加了流程复杂度和出错可能。

用户需求：选择 agent 后直接将其默认配置写入 `vscodeAcp.agents`，无需提前下载。

## Goals / Non-Goals

**Goals:**
- 用户从 registry 选择 agent 后，直接将默认命令配置写入 `vscodeAcp.agents`
- 移除 binary 下载逻辑，简化代码
- 保留自动连接流程
- 保留已存在 agent 的覆盖确认

**Non-Goals:**
- 不修改 webview 端的 AgentSelector 组件（已发送 `discover_agents` 消息，后端处理即可）
- 不修改 RegistryService 的 registry 获取逻辑
- 不修改 AgentRegistry/AgentConnection 的核心逻辑

## Decisions

### D1: 移除 binary 下载，统一为配置写入

**选择**: 移除 `downloadAndExtractBinary`、`extractArchive`、`findBinary`、`getAgentDir`、`execFileAsync` 等函数，`installAgent` 简化为 `registerAgent`。

**理由**: 用户需求明确——不下载，只写配置。binary 分发的 `cmd` 字段本身就是可执行命令路径，用户可自行安装后使用。npx/uvx 天然无需预下载。

**替代方案**: 保留 binary 下载作为可选步骤 → 增加复杂度，与用户需求不符。

### D2: 确认对话框从"Install"改为"Add"

**选择**: 将确认对话框文案从 "Install {name} v{version}?" 改为 "Add {name} to agent configuration?"，按钮从 "Install" 改为 "Add"。

**理由**: 实际操作是添加配置而非安装软件，文案应准确反映行为。

### D3: 保留覆盖确认逻辑

**选择**: 保留已存在 agent 的覆盖确认（"Already configured. Overwrite?"）。

**理由**: 防止意外覆盖用户自定义的 agent 配置。

## Risks / Trade-offs

- [Binary agent 无法自动下载] → 用户需自行安装 binary 到 PATH 或修改配置中的 command 路径。这是用户明确要求的取舍。
- [npx/uvx 首次连接时需下载] → 这是 npx/uvx 的正常行为，连接时会有进度提示，不影响功能。
