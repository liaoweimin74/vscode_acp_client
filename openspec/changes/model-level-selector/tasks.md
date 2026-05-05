## 1. 工具函数

- [ ] 1.1 在 `src/shared/utils.ts` 中新增 `isGroupedOptions` 类型守卫函数，判断 options 是否为 `Array<SessionConfigSelectGroup>`
- [ ] 1.2 在 `src/shared/utils.ts` 中新增 `findGroupByValue` 函数，根据 currentValue 查找其所属的 group
- [ ] 1.3 在 `src/shared/utils.ts` 中新增 `getDefaultLevel` 函数，按优先级选择默认级别（high > medium > 首个）

## 2. ConfigBar 组件重构

- [ ] 2.1 重构 `ConfigBar.tsx` 模型下拉菜单：分组时仅显示组名，平铺时保持原样
- [ ] 2.2 在模型按钮右侧新增级别选择下拉框，仅当当前模型属于分组时显示
- [ ] 2.3 实现切换模型组时自动选择默认级别（调用 setConfig）
- [ ] 2.4 实现切换级别时调用 setConfig 更新模型
- [ ] 2.5 模型按钮显示当前组名（分组时）或选项名（平铺时）

## 3. 样式

- [ ] 3.1 在 `ConfigBar.css` 中添加级别选择器样式（小号按钮、下拉菜单）

## 4. VSCode 命令适配

- [ ] 4.1 修改 `selectModel.ts` 命令：分组时先选组再选级别（两步 QuickPick），平铺时保持原样

## 5. 验证

- [ ] 5.1 构建扩展并验证 webview 编译通过
- [ ] 5.2 运行现有测试确保无回归
