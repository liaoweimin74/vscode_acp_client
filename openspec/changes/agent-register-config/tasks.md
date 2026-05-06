## 1. Simplify discoverAgents command

- [x] 1.1 Remove `downloadAndExtractBinary`, `extractArchive`, `findBinary`, `getAgentDir`, `execFileAsync` functions from `discoverAgents.ts`
- [x] 1.2 Remove unused imports (`path`, `fs`, `execFile`) from `discoverAgents.ts`
- [x] 1.3 Rename `installAgent` to `registerAgent`, remove binary download logic, simplify to config-only write
- [x] 1.4 Change confirmation dialog from "Install {name} v{version}?" to "Add {name} to agent configuration?" with "Add" button

## 2. Update localization strings

- [x] 2.1 Update `package.nls.json`: change "Install" → "Add", "Install {0} v{1}?" → "Add {0} to agent configuration?", "Installing {0}..." → "Adding {0}..." (N/A - these are vscode.l10n.t() inline strings, already updated in source)
- [x] 2.2 Update `package.nls.zh-cn.json`: same changes in Chinese (N/A - same reason)
- [x] 2.3 Update `package.nls.zh-tw.json`: same changes in Traditional Chinese (N/A - same reason)

## 3. Verify

- [ ] 3.1 Build passes (`npm run build:all`)
- [ ] 3.2 Tests pass (`npm test`)
