## Why

当前"Discover Agents"流程要求用户选择 agent 后先下载/安装二进制文件，再写入配置。对于通过 npx/uvx 分发的 agent，用户只需将默认命令配置加入 `vscodeAcp.agents` 即可，无需提前下载。当前流程对这类 agent 增加了不必要的等待和复杂度。

## What Changes

- 修改 `discoverAgents` 命令：用户选择 agent 后，跳过下载步骤，直接将 registry 中的默认命令配置（npx/uvx/binary cmd）写入 `vscodeAcp.agents` 配置
- 移除 binary 分发的下载逻辑（`downloadAndExtractBinary`、`extractArchive`、`findBinary` 等）
- 移除安装确认对话框，改为配置添加确认
- 保留已存在 agent 的覆盖确认逻辑
- 保留选择后的自动连接流程

## Capabilities

### New Capabilities
- `agent-config-register`: 从 registry 选择 agent 后直接将其默认配置写入插件设置，无需下载安装

### Modified Capabilities

## Impact

- `src/extension/commands/discoverAgents.ts`：主要修改文件，移除下载逻辑，简化为配置写入
- `src/extension/RegistryService.ts`：`getAgentCommand` 方法保留，用于获取默认命令
- `src/shared/types/registry.ts`：无变更
- `package.nls.json` / `package.nls.zh-cn.json` / `package.nls.zh-tw.json`：更新/新增本地化字符串（"Install" → "Add" 等）
