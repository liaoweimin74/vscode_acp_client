## Context

当前 `vscodeAcp.discoverAgents` 命令的完整流程为：获取 registry → 展示 agent 列表 → 用户选择 → 下载/安装（npx/binary/uvx）→ 写入配置 → 自动连接。其中下载步骤是最大的复杂度和失败点，涉及 `downloadAndExtractBinary`、`extractArchive`、`findBinary` 等约 100 行代码。

用户实际场景：已安装 agent CLI（如 opencode、claude code 等），只需将启动配置加入插件即可。

## Goals / Non-Goals

**Goals:**
- 用户选择 registry agent 后，仅将默认配置写入 `vscodeAcp.agents`，不执行下载
- 移除所有下载/解压相关代码，降低维护成本
- 保留重复检测和覆盖确认逻辑
- 保留平台可用性展示（作为信息提示，不阻止添加）

**Non-Goals:**
- 不改变 registry 数据结构或 RegistryService
- 不改变 ConfigurationManager 的接口
- 不改变 webview 端的 agent 选择器行为
- 不实现自动检测本地是否已安装 agent CLI

## Decisions

### 1. 直接使用 RegistryService.getAgentCommand() 获取配置

`getAgentCommand()` 已能从 registry 的 distribution 字段推导出 command/args/env，无需新增逻辑。对于 binary 分发，直接使用 `bin.cmd` 作为 command（假设用户已安装），不再下载解压。

**替代方案**：仅对 npx/uvx 类型自动配置，binary 类型提示用户手动配置 → 拒绝，因为 binary 的 cmd 字段就是 CLI 名称，用户若已安装则可直接使用。

### 2. 不可用平台仍允许添加，但给出警告

当前逻辑：平台不可用时阻止安装。修改为：允许添加配置，但 QuickPick 中标记不可用，选择后弹出警告说明可能无法正常运行，用户确认后仍可添加。

### 3. 添加后不自动连接

原流程添加配置后自动连接。新流程仅添加配置并提示用户通过 agent 选择器连接，简化流程并避免连接失败时的复杂错误处理。

## Risks / Trade-offs

- [用户未安装 CLI] → 配置写入后连接会失败，但错误信息已足够清晰（"Failed to connect"），且用户可自行修改配置
- [binary 分发的 cmd 可能是相对路径] → `getAgentCommand` 返回的 binary cmd 可能是 `./bin/agent`，直接写入配置后可能无法找到 → 需在添加时对 binary 类型做简单处理，仅取命令名部分或提示用户
