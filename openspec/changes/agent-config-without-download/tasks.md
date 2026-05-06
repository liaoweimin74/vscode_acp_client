## 1. 重构 discoverAgents 命令

- [ ] 1.1 移除 `downloadAndExtractBinary`、`extractArchive`、`findBinary`、`execFileAsync`、`getAgentDir` 函数
- [ ] 1.2 移除 `path`、`fs`、`child_process` 等不再需要的 import
- [ ] 1.3 重写 `installAgent` 函数为 `addAgentConfig`：从 `getAgentCommand()` 获取配置，写入 `vscodeAcp.agents`，不执行下载
- [ ] 1.4 修改 binary 分发的 command 处理：剥离 `./` 或 `.\\` 前缀

## 2. 修改交互流程

- [ ] 2.1 修改确认对话框：从 "Install" 语义改为 "Add to Configuration" 语义
- [ ] 2.2 修改平台不可用时的行为：允许添加但显示警告，用户确认后继续
- [ ] 2.3 移除添加后的自动连接逻辑，改为提示用户通过 agent 选择器连接

## 3. 本地化

- [ ] 3.1 更新 `package.nls.json`：修改/新增相关字符串（"Add to Configuration"、"Agent added" 等）
- [ ] 3.2 更新 `package.nls.zh-cn.json`：对应中文翻译
- [ ] 3.3 更新 `package.nls.zh-tw.json`：对应繁体中文翻译

## 4. 验证

- [ ] 4.1 运行 `npm run build:all` 确认构建通过
- [ ] 4.2 运行 `npm run lint` 确认无新增错误
