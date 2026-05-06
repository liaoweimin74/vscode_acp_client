## Why

当前 "Discover Agents" 命令在选择 agent 后会执行下载/安装流程（npx、binary 下载解压、uvx），这对用户来说步骤较重且容易因网络或环境问题失败。用户实际需要的是：选择一个 registry 中的 agent 后，仅将其默认启动配置（command、args、env）写入 `vscodeAcp.agents` 配置，跳过下载步骤，由用户自行确保 agent CLI 已安装。

## What Changes

- 修改 `discoverAgents` 命令：用户选择 agent 后，不再调用 `installAgent`（下载/解压/连接），而是直接从 registry 数据中提取默认配置并写入 `vscodeAcp.agents`
- 移除 `downloadAndExtractBinary`、`extractArchive`、`findBinary`、`execFileAsync`、`getAgentDir` 等下载相关函数
- 简化确认对话框：从 "Install" 改为 "Add to configuration" 语义
- 保留重复检测逻辑（已有同 id agent 时的覆盖确认）
- 保留平台可用性检查，但调整提示语义（不可用时仍可添加配置，但给出警告）
- 选择完成后不自动连接，仅提示用户可通过 agent 选择器连接

## Capabilities

### New Capabilities
- `agent-quick-config`: 从 registry 选择 agent 并将其默认配置写入插件设置，无需下载安装

### Modified Capabilities

## Impact

- `src/extension/commands/discoverAgents.ts`：主要修改文件，简化为配置写入逻辑
- `src/extension/RegistryService.ts`：`getAgentCommand` 方法继续使用，无需修改
- `src/shared/types/registry.ts`：无变更
- `src/extension/ConfigurationManager.ts`：无变更（已有 `getAgentConfigs` 和配置更新逻辑）
- `package.nls.json` / `package.nls.zh-cn.json` / `package.nls.zh-tw.json`：新增/修改本地化字符串
