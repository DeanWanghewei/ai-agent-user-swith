# 设计:预设 Claude 协议 Provider (Preset Providers)

- 日期: 2026-07-24
- 状态: 待评审 (rev2)
- 版本目标: 1.12.1 → 1.13.0 (minor,新功能)

## 1. 背景与目标

为 `ais add` 与 WebUI 提供内置的「Claude 协议(Anthropic 兼容)Provider 预设」,用户选择某个 provider 后,
**只需填 API Key、确认 Base URL**,即可快速创建配置合理的 Claude 账号(含正确 apiUrl、推荐环境变量、两个预设模型组)。
所有字段套用预设后**仍可修改**——预设只是起点。

预设数据**随包发布**,由维护者在「新增 provider」或「软件升级」时维护,不在运行时由用户编辑。

## 2. 内置 Provider(端点均为官方文档确认的 Anthropic 协议端点)

| Provider | apiUrl | 说明 |
|---|---|---|
| GLM 智谱 | `https://open.bigmodel.cn/api/anthropic` | 1M 上下文模型 |
| MiniMax | `https://api.minimax.io/anthropic` | |
| 通义千问(百炼) | `https://dashscope.aliyuncs.com/apps/anthropic` | 仅 `/v1/messages`,无 `/v1/models`,CC 探测 404 属正常 |
| Kimi(Moonshot) | `https://api.moonshot.ai/anthropic` | |

## 3. 环境变量分层(核心设计)

### 3.1 Provider 级(所有模型都需要 → 进 `account.customEnv`)

```js
const PROVIDER_ENV = {
  CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1'   // 所有 provider 都需要(唯一全局项)
};
```

- 写入 `account.customEnv`,随账号持久化;生成器对 `customEnv` 的保留逻辑不变。

### 3.2 模型组级(按模型/按组的特殊参数 → 随活动模型组切换)

```js
// src/constants.js 新增
const GROUP_ENV_KEYS = ['CLAUDE_CODE_AUTO_COMPACT_WINDOW', 'ENABLE_TOOL_SEARCH'];
```

- 模型组配置对象中可包含 `GROUP_ENV_KEYS` 里的键(与 MODEL_KEYS 平级存放)。
- 生成器采用**保留式(non-destructive)**语义(关键兼容设计):
  - 清洗步骤**不变** —— 仍只剔除 `MODEL_KEYS`,保留其余 env(含 `GROUP_ENV_KEYS`)。
  - 对活动模型组**已定义**的组级键 → 写入(覆盖该键当前值)。
  - 对活动模型组**未定义**的组级键 → **保持现有 env 不变**,绝不清除。
  - 这与 MODEL_KEYS 的「全清洗再重写」刻意不同:组级参数是可选的,全清洗会误删用户手动设置的值。
- 兼容性:升级后老账号(组里无 GROUP_ENV_KEYS)零改动;用户用 `ais env set` 手动设的值也不会被清。
- 已知边界:若同一项目内从「定义了某组级键的账号/组」切到「未定义它的」,该键会残留(lingering)。`AUTO_COMPACT_WINDOW`/`ENABLE_TOOL_SEARCH` 残留均无害;如需清除用 `ais env unset <key>`。
- 与 `MODEL_KEYS` 同为「已知清单」模式 —— 新增组级参数 = 往 `GROUP_ENV_KEYS` 加键(发布时维护)。

> `ENABLE_TOOL_SEARCH=0` 下放到模型组(按用户要求),所有预设模型组统一关闭;未来某些模型若需要开启,按组调整即可。

## 4. 预设数据结构(`src/presets.js` 新文件)

```js
const PROVIDER_ENV = { CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1' };

const PRESETS = [
  {
    key: 'glm',
    name: 'GLM 智谱',
    type: 'Claude',
    apiUrl: 'https://open.bigmodel.cn/api/anthropic',
    description: '智谱 GLM (Anthropic 协议兼容)',
    customEnv: { ...PROVIDER_ENV },
    modelGroups: {
      latest:   { label: '全部最新模型', config: { DEFAULT_MODEL: 'glm-5.2[1m]', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000', ENABLE_TOOL_SEARCH: '0' } },
      balanced: { label: '合理均衡配置', config: { DEFAULT_MODEL: 'glm-5.2[1m]', ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-5', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000', ENABLE_TOOL_SEARCH: '0' } }
    },
    defaultActiveGroup: 'latest'
  },
  // minimax / qwen / kimi 见下表
];

module.exports = { PRESETS, PROVIDER_ENV, getPresets(), findPreset(key) };
```

- `label` 仅用于交互展示;写入账号的是 `config`(只含 MODEL_KEYS + GROUP_ENV_KEYS)。
- 应用预设时**两个组都创建到账号**,用户选哪个为 active。
- **所有预设 `defaultActiveGroup: 'latest'`**(默认激活「全部最新模型」组)。

### 各 Provider 模型组 config

| Provider | 组 | config |
|---|---|---|
| GLM | latest | `{DEFAULT_MODEL:'glm-5.2[1m]', CLAUDE_CODE_AUTO_COMPACT_WINDOW:'1000000', ENABLE_TOOL_SEARCH:'0'}` |
| GLM | balanced | `{DEFAULT_MODEL:'glm-5.2[1m]', ANTHROPIC_DEFAULT_HAIKU_MODEL:'glm-5', CLAUDE_CODE_AUTO_COMPACT_WINDOW:'1000000', ENABLE_TOOL_SEARCH:'0'}` |
| MiniMax | latest | `{DEFAULT_MODEL:'MiniMax-M2.7', ENABLE_TOOL_SEARCH:'0'}` |
| MiniMax | balanced | `{DEFAULT_MODEL:'MiniMax-M2.7', ENABLE_TOOL_SEARCH:'0'}` (haiku 按 M2.7 回退) |
| Qwen | latest | `{DEFAULT_MODEL:'qwen3-coder-plus', ENABLE_TOOL_SEARCH:'0'}` |
| Qwen | balanced | `{DEFAULT_MODEL:'qwen3-coder-plus', ENABLE_TOOL_SEARCH:'0'}` |
| Kimi | latest | `{DEFAULT_MODEL:'kimi-k3', ENABLE_TOOL_SEARCH:'0'}` |
| Kimi | balanced | `{DEFAULT_MODEL:'kimi-k3', ANTHROPIC_DEFAULT_HAIKU_MODEL:'kimi-k2', ENABLE_TOOL_SEARCH:'0'}` |

- `AUTO_COMPACT_WINDOW=1M` 仅 GLM 组(配 1M 上下文模型);其余 provider 不设,沿用 CC 默认,避免写入错误窗口值。
- `ENABLE_TOOL_SEARCH=0` 所有预设组统一关闭。

## 5. CLI 集成(`src/commands/account.js`)

`addAccount` 最前面插入「提供商选择」(inquirer list):`[GLM 智谱] [MiniMax] [通义千问] [Kimi] [自定义 Custom]`

- **选「自定义」** → 现有完整流程不变(含类型选择)。
- **选预设** → 先打印预设概览(只读,给用户上下文):
  ```
  📋 GLM 智谱 预设
    Base URL: https://open.bigmodel.cn/api/anthropic
    模型组: 合理均衡配置(默认) / 全部最新模型
    环境变量: CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1
    组级参数: CLAUDE_CODE_AUTO_COMPACT_WINDOW=1000000, ENABLE_TOOL_SEARCH=0
  ```
  随后交互(按序):
  1. **API Key**(必填)
  2. **账号名**(默认取 `preset.key`,如 `glm`)
  3. **Base URL** ← `inquirer input`,默认值 = `preset.apiUrl`,提示「可直接回车确认,或修改」。**用户可改**(对应需求 1)
  4. **激活模型组**:列表 = 预设两组(latest/balanced,默认选 `latest`)+「➕ 新建自定义模型组」选项。选预设组即设为 active;选「新建自定义」则调用现有 `promptForModelGroup()` 创建并询问是否设为 active。账号创建后仍可用 `ais model add/use/rm` 继续增删改模型组(预设组不锁死,与普通 Claude 账号一致)。
  5. email / description(可选,description 默认取预设值)
  - `customEnv`、两组 `modelGroups`、`activeModelGroup` 由预设带入。
  - `config.addAccount` 保存(**只保存,不切换**项目账号,与现有 `add` 一致)。

## 6. WebUI 集成(`src/ui-server.js`)—— 重点设计

遵循「为人设计」原则:预设是起点,唯一必填空项是 API Key;其余全部预填且可改;无隐藏魔法,组级参数也透明可编辑。

### 6.1 后端
- 新增 `GET /api/presets` → 返回 `{key, name, apiUrl, description, modelGroups:{name:{label,config}}, defaultActiveGroup}`。
- `POST /api/accounts` 无需改动(已接收完整 accountData)。

### 6.2 添加弹窗交互
- 弹窗顶部第一项为「**提供商 Provider**」下拉:`[自定义] [GLM 智谱] [MiniMax] [通义千问] [Kimi]`。
- 选预设:
  - 类型自动 = Claude,显示为锁定态 `Claude 🔒(预设)`(类型下拉禁用/隐藏)。
  - 预填:账号名(`preset.key`)、Base URL(`preset.apiUrl`,**可编辑**)、description。
  - 注入 provider 级环境变量到 `envVarsList`(`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`)。
  - 注入两个模型组到 `modelGroupsList`,active badge 默认设到 `latest`。
  - 顶部出现提示条:`💡 已套用 <预设名>,所有字段均可修改,只需填写 API Key`。
- 选「自定义」:类型下拉恢复可用,走现有表单。

### 6.3 模型组表单增强(关键细枝末节)
现有模型组表单项只收 MODEL_KEYS。**新增「特殊参数」子列表**(复用 envVarsList 的 KEY=VALUE 行 UI),每个模型组项底部展示该组的 `GROUP_ENV_KEYS`:
```
特殊参数 (Special params):
  • CLAUDE_CODE_AUTO_COMPACT_WINDOW = 1000000   [×]
  • ENABLE_TOOL_SEARCH = 0                       [×]
  [+ 添加参数]
```
- `saveAccount()` 收集时,把每组特殊参数写入该组 `groupConfig`(与 MODEL_KEYS 平级)。
- 这样预设带入的组级参数对用户**完全透明、可增删改**,非预设账号也能用。
- 此增强同时让 WebUI 与生成器的 `GROUP_ENV_KEYS` 能力对齐(此前 WebUI 无法表达组级 env)。

### 6.4 原型(GLM 预设载入后)
```
┌─ 添加账号   [预设: GLM 智谱] ─────────────────────────────────┐
│ 💡 已套用 GLM 预设,所有字段均可修改 —— 只需填写 API Key         │
│                                                                │
│ 提供商 [GLM 智谱 ▾]        类型 [Claude 🔒 预设]                │
│ 账号名称 * [glm                          ]                      │
│ API Key  * [••••••••••••••••••••  📋paste]   ← 打开即自动聚焦   │
│ Base URL * [https://open.bigmodel.cn/api/anthropic          ]  │
│            ℹ️ 预设地址,如不正确可直接修改                       │
│ 邮箱      [                              ]                      │
│ 描述      [智谱 GLM (Anthropic 协议兼容) ]                     │
│                                                                │
│ ── 环境变量 (Provider 级) ──                                  │
│   • CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS = 1         [×]     │
│   [+ 添加环境变量]                                             │
│                                                                │
│ ── 模型组 ──  (点 ● 切换活动组)                                │
│ ┌ ● 合理均衡配置                        [设为活动] [×删除] ┐   │
│ │ DEFAULT_MODEL [glm-5.2[1m]]  OPUS [ ]  SONNET [ ]       │   │
│ │ HAIKU [glm-5]  SUBAGENT [ ]   ANTHROPIC [ ]             │   │
│ │ 特殊参数:                                                │   │
│ │   • CLAUDE_CODE_AUTO_COMPACT_WINDOW = 1000000    [×]    │   │
│ │   • ENABLE_TOOL_SEARCH = 0                        [×]    │   │
│ │   [+ 添加参数]                                           │   │
│ └──────────────────────────────────────────────────────────┘   │
│ ┌ ○ 全部最新模型                        [设为活动] [×删除] ┐   │
│ │ DEFAULT_MODEL [glm-5.2[1m]]  ...                        │   │
│ │ 特殊参数: AUTO_COMPACT_WINDOW=1M, ENABLE_TOOL_SEARCH=0   │   │
│ └──────────────────────────────────────────────────────────┘   │
│ [+ 添加模型组]                                                 │
│                                                                │
│                             [取消]   [💾 保存账号]             │
└────────────────────────────────────────────────────────────────┘
```

### 6.5 体验细节清单(细枝末节)
- **API Key 自动聚焦**:预设载入后光标落在 API Key(唯一必填空项)。
- **Base URL 预填+可改+提示**:不静默套用,显式可编辑 + helper 说明。
- **预设徽章 + 提示条**:让用户清楚自己在编辑预设派生账号,且「皆可改」。
- **类型锁定但可见**:透明,不藏。
- **活动组切换明显**:`●/○` + 「设为活动」按钮,默认 active = `latest`。
- **自定义模型组一等公民**:「+ 添加模型组」与预设注入的组并存,用户可新增/编辑/删除任意模型组(含其特殊参数),预设组不锁死。
- **组级参数透明可编辑**:不再是隐藏注入,与 provider 级 env 同样的 KEY=VALUE 行 UI。
- **校验**:API Key 必填、Base URL 必填、至少一个模型组、活动组必须存在。
- **双语 i18n**:与现有界面一致。

## 7. 涉及文件

| 文件 | 改动 |
|---|---|
| `src/presets.js` (新) | `PROVIDER_ENV`、`PRESETS`、`getPresets()`、`findPreset(key)` |
| `src/constants.js` | 新增 `GROUP_ENV_KEYS` |
| `src/generators/claude-generator.js` | 清洗步骤扩展到 `GROUP_ENV_KEYS`;`_applyModelConfig` 从活动组重写 `GROUP_ENV_KEYS` |
| `src/commands/account.js` | `addAccount` 注入提供商选择 + 预设概览 + Base URL 可编辑确认 + 预设分支 |
| `src/ui-server.js` | `GET /api/presets`;弹窗提供商下拉+预设徽章+提示条;模型组表单增「特殊参数」子列表;`saveAccount` 收集组级 env;API Key 自动聚焦 |
| `src/migration.js` (新) | `maybeRunMigration()`:版本检测 + 候选扫描 + opt-in 提示 + 套用(方案 B) |
| `src/index.js` | 启动调用 `maybeRunMigration()`(TTY 内) |
| `src/config/global-config.js` | 读写 `migration.lastRunVersion` |
| `package.json` | 1.12.1 → 1.13.0 |
| `README.md` / `CLAUDE.md` | 文档说明预设、分层 env、组级 env 行为 |

## 8. 向后兼容与升级迁移

### 8.1 兼容性(无需强制迁移)
- **Schema 纯加法**:新增 `GROUP_ENV_KEYS` 常量、预设可选的组级键;账号对象无任何新增必填字段。老 `config.json` 直接可读。
- **生成器非破坏**:组级 env 采用保留式语义(§3.2),老账号(组里无组级键)重生成时零改动;用户手动 env 不被清除。
- `addAccount`「自定义」路径完全不变;`MODEL_KEYS` 清洗逻辑保留。
- 结论:**升级后旧配置照常工作,不会坏,不需要强制迁移。**

### 8.2 升级一次性迁移(已选:方案 B)
旧账号不会自动获得推荐 env。采用**升级检测 + 一次性 opt-in 提示**:

- 全局配置(`~/.ai-account-switch/config.json`)记录 `migration.lastRunVersion`。
- CLI 启动(`src/index.js`):若 `lastRunVersion` 缺失或 < 当前 `packageJson.version`,执行一次迁移检查。**仅在交互式 TTY 下触发;非交互/管道下跳过,绝不静默改写。**
- 扫描所有 Claude 账号,收集候选:
  1. `customEnv` 缺 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` → 可补充该推荐 provider 级变量。
  2. `apiUrl` 命中某预设 → 可套用该预设的 `modelGroups` + 组级参数。**仅当账号尚无 `modelGroups` 时才建议套用**;已有自定义模型组则跳过(不覆盖用户配置),只补充 provider 级变量。
- 有候选才提示:「检测到 N 个账号可补充推荐配置:[清单]。是否补充?」选项:`全部补充 / 逐个选择 / 跳过`。
- 处理后(含「跳过」)写回 `migration.lastRunVersion = 当前版本`,不再重复提示。
- 原则:非破坏、可跳过、可预览、默认不改、只加不删;组级参数仅在命中预设时建议。

## 9. 待确认 / 风险
1. 模型名(`glm-5.2[1m]`、`glm-5`、`MiniMax-M2.7`、`qwen3-coder-plus`、`kimi-k3`、`kimi-k2`)以用户指定为准;若 provider 端实际名称不同,在 `src/presets.js` 调整(发布时维护)。
2. Qwen 端点无 `/v1/models`,Claude Code 可能提示「未找到模型」属正常,在 CLI/UI 提示中说明。
3. WebUI 原型(§6.4)的布局与交互是否认可 —— 尤其「特殊参数」子列表、API Key 自动聚焦、预设徽章这几处。
4. ~~迁移范围(§8.2)~~ —— 已定:方案 B(升级一次性提示)。

## 10. 不做(YAGNI)
- 不新增 `ais preset list` 命令(预设只在 `ais add` / WebUI 触发)。
- 不做预设的运行时编辑/导入导出(随包发布,源码维护)。
- CLI 手动 `ais model add` 暂不提示输入组级 env(预设直接注入;WebUI 已支持编辑)。
