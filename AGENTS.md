<!-- superspec:start -->
# SuperSpec — AI Agent 指令

## 🚨 执行任何任务前

1. **读取配置**：`superspec.config.json` → 获取 `lang`、`specDir`、`boost`、`strategy`、`context`
2. **审查项目上下文**：
   - 读取 `context` 文件（项目规则/约定）
   - 检查项目 README、架构文档、CONTRIBUTING.md
   - 若未配置 `context`，自动检查：`.cursor/rules/`、`AGENTS.md`、`CONTRIBUTING.md`
3. **检查当前状态**：
   - 运行 `/ss-status` 或检查 `{specDir}/changes/` → 了解活跃变更
   - 通过 `depends_on` 审查相关变更，避免重复
4. **读取当前变更上下文**：
   - 按优先级确定 `strategy`：用户输入 `-c` > 配置默认值
   - 读取 frontmatter `input` 字段 → 理解用户原始意图
   - 若 `strategy: follow` → 将上下文文件视为约束（必须遵循）
   - 若 `strategy: create` → 将上下文文件视为参考（可偏离，但需说明理由）
5. **禁止手动创建变更文件夹** → 使用 `superspec create` CLI 或 `/ss-create`

---

## 🧭 基本原则

| # | 原则 | 规则 |
|---|------|------|
| I | **上下文精简** | 每个产物不超过 300 行，硬上限 400 行。超出 → 拆分。10 分钟内可读完。 |
| II | **信噪比** | 每句话都必须为决策提供信息。删除后无影响 → 删除。 |
| III | **意图优于实现** | 关注 **为什么** 和 **做什么**。让 **怎么做** 在 `/ss-apply` 阶段自然涌现。 |
| IV | **渐进式展开** | 从最小化开始。仅在需要澄清时才扩展。 |
| V | **必要章节** | 元数据头、问题、方案、成功标准、权衡取舍。 |

---

## 🎯 标准模式 vs 增强模式

| | 标准模式（轻量） | 增强模式（Boost） |
|---|---|---|
| **适用场景** | 简单任务、bug 修复、小功能 | 大型功能、破坏性变更、复杂设计 |
| **产物** | proposal + checklist + tasks | proposal + spec + checklist + tasks（+ design 可选） |
| **proposal 定位** | 需求 + 技术方案（自含，可直接拆 task） | 需求背景（Goals, Risks, Impact） |
| **spec 定位** | — | 需求细节 + 交互（US/FR/AC/Edge Cases） |
| **Checklist 时机** | proposal 后自动检查（/ 10） | spec 后自动检查（/ 25） |
| **Task 粒度** | 灵活 | 每个任务 < 1 小时 |
| **交叉验证** | — | 自动：US↔FR↔AC↔tasks |
| **边界情况** | 基础 | 全面 |

**核心流程**：

```
标准模式:  /ss-create (proposal → checklist ✓) → /ss-tasks → /ss-apply → [vibe: sync → /ss-resume] → /ss-archive
增强模式:  /ss-create -b (proposal → spec → [auto: split? design?] → checklist ✓) → /ss-tasks → /ss-apply → ...
按需使用:  /ss-clarify, /ss-checklist, /ss-lint, /ss-validate, /ss-search, /ss-link, /ss-unlink, /ss-deps
```

---

## 🧩 策略：follow vs create

| | `follow`（默认） | `create`（`-c` / `--creative`） |
|---|---|---|
| **行为** | 读取 `context` 文件 → 严格遵循项目规则/模式 | 了解 `context` 但可偏离，需说明理由 |
| **Proposal** | 方案与现有架构对齐 | 可提出新架构/模式 |
| **Spec** | 需求适配当前系统设计 | 需求可引入新范式 |
| **Tasks** | 使用现有文件结构、命名、依赖 | 可创建新结构、建议新依赖 |
| **适用** | 常规功能、bug fix、遵循既有规范 | 架构重构、新模块设计、UX 创新 |

### 上下文文件

配置中的 `context` 列出了 AI 应读取以了解项目约定的文件：

```json
{
  "context": [".cursor/rules/coding-style.mdc", "AGENTS.md", "docs/conventions.md"]
}
```

- **follow**：读取这些文件 → 视为约束（必须遵循）
- **create**：读取这些文件 → 视为参考（可偏离，但需说明理由）
- 未配置 `context`？AI 自动检查：`.cursor/rules/`、`AGENTS.md`、`CONTRIBUTING.md`
- 单次变更覆盖：在 frontmatter 中添加 `context: ["src/auth/README.md"]`

---

## ⚠️ 核心规则

| 规则 | 说明 |
|------|------|
| 语言 | 遵循 `lang` 配置：`"zh"` → 中文，`"en"` → 英文。所有产物和交互均适用。 |
| 先读后写 | 写入前先读取已有内容。保留用户编辑。 |
| 一致性 | 增强模式下：`US-1`、`FR-1`、`AC-1.1` 必须在所有产物中保持一致。 |
| 状态追踪 | 🟡 草稿 → 🟢 就绪 → ✅ 完成。每步后更新。 |

---

## 🚫 禁止 / 应当

| ❌ 禁止 | ✅ 应当 |
|----------|------|
| 不经规划直接编码 | `/ss-create` → `/ss-tasks` → `/ss-apply` |
| 对简单任务过度设计 | 使用标准模式。仅在复杂度需要时才用增强模式。 |
| 手动创建文件夹 | `superspec create <feature>` 或 `/ss-create` |
| 忽略 `clarify.md` | 生成/更新前先读取 |
| 覆盖用户编辑 | 合并，而非替换 |

---

## 🔧 命令

| 命令 | 模式 | 功能 |
|---------|------|------|
| `/ss-create <feature>` | 两者 | 创建文件夹 + 分支，生成 proposal（增强模式下含 spec），自动运行 checklist 门控 |
| `/ss-tasks` | 两者 | AI 从 proposal 生成任务列表（增强模式：从 proposal + spec） |
| `/ss-apply` | 两者 | 实现任务 |
| `/ss-clarify` | 两者 | 解决歧义 |
| `/ss-archive` | 两者 | 归档已完成的变更 |
| `/ss-checklist` | 两者 | 质量门控：标准模式（proposal 后 / 10）或增强模式（spec 后 / 25）。由 /ss-create 自动调用，也可手动调用 |
| `/ss-status` | 两者 | 查看所有变更 |
| `/ss-lint` | 两者 | 检查产物大小 |
| `/ss-validate` | 增强 | 交叉引用一致性检查 |
| `/ss-search <q>` | 两者 | 跨变更全文搜索 |
| `/ss-link` | 两者 | 添加 spec 依赖（`deps add`） |
| `/ss-unlink` | 两者 | 移除 spec 依赖（`deps remove`） |
| `/ss-deps` | 两者 | 查看依赖图（`deps list`） |
| `/ss-resume` | 两者 | 恢复 spec 上下文用于 vibe 编码（运行 sync → 读取 context.md） |
| `superspec sync` | 两者 | CLI：将 git diff 收集到 context.md（零 AI token 消耗） |

---

## 📐 产物

**按需生成**：CLI `superspec create` 仅创建文件夹 + git 分支。AI 从 `{specDir}/templates/` 读取模板作为结构参考，然后在需要时生成每个产物的实际内容 — 绝不预先创建空模板文件。

| 产物 | 生成者 | 时机 |
|----------|-------------|------|
| proposal.md | `/ss-create` | 始终（标准模式：需求 + 技术方案；增强模式：需求背景） |
| spec.md | `/ss-create -b` | 增强模式（需求细节 + 交互） |
| design.md | `/ss-create -b` | 增强模式，自动检测是否需要 |
| checklist.md | `/ss-create`（自动） | 始终，proposal 后（标准模式）或 spec 后（增强模式） |
| tasks.md | `/ss-tasks` | 按需，checklist 通过后 |
| clarify.md | `/ss-clarify` | 按需 |

**标准模式：**
```
{specDir}/changes/<name>/
├── proposal.md    — 需求 + 技术方案（由 /ss-create 生成）
├── checklist.md   — 质量门控 / 10（由 /ss-create 自动生成）
└── tasks.md       — 可执行步骤（由 /ss-tasks 生成）
```

**增强模式：**
```
{specDir}/changes/<name>/
├── proposal.md    — 需求背景（由 /ss-create -b 生成）
├── spec.md        — 需求细节 + 交互（由 /ss-create -b 生成）
├── design.md      — 架构决策（可选，由 /ss-create -b 自动检测）
├── checklist.md   — 质量门控 / 25（由 /ss-create -b 自动生成）
├── tasks.md       — 分阶段实现步骤（由 /ss-tasks 生成）
└── clarify.md     — 问答与决策（由 /ss-clarify 生成）
```

**何时使用 design.md**（增强模式下可选）：
- 方案跨多个系统或引入新架构模式
- 重大架构决策涉及显著权衡
- 需要在确定 spec 前记录决策理由
- 需要跨团队架构对齐

**Spec 增量 - 多能力结构**（大型变更推荐）：
当变更涉及多个独立能力时，按能力领域拆分 spec：

```
{specDir}/changes/<name>/
├── proposal.md
├── design.md
├── specs/
│   ├── auth/              — 认证能力
│   │   └── spec.md
│   ├── api/               — API 层能力
│   │   └── spec.md
│   └── ui/                — UI 组件能力
│       └── spec.md
├── tasks.md
└── checklist.md
```

**基于能力拆分的优势**：
- 每个 spec.md 保持在 300 行目标内
- 关注点清晰分离
- 更易并行审查和实现
- 交叉引用可追溯性更好

每个产物包含 YAML frontmatter：`name`、`status`、`strategy`、`depends_on: []`、`input`（仅 proposal.md，记录用户原始输入）。

**策略优先级**（从高到低）：用户输入 `-c` > `superspec.config.json` 默认值。

---

## ⚙️ 配置

| 字段 | 默认值 | 用途 |
|-------|---------|------|
| `lang` | `"zh"` | 产物语言 |
| `specDir` | `"superspec"` | Spec 文件夹 |
| `branchPrefix` | `"spec/"` | Git 分支前缀 |
| `boost` | `false` | 启用增强模式 |
| `strategy` | `"follow"` | `follow` = 遵循项目规则，`create` = 自由探索 |
| `context` | `[]` | AI 应读取的项目约定文件 |
| `limits.targetLines` | `300` | 每个产物的目标最大行数 |
| `limits.hardLines` | `400` | 每个产物的硬性最大行数 |

<!-- superspec:end -->
