# Preset Claude-Protocol Providers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship built-in Claude-protocol provider presets (GLM / MiniMax / Qwen / Kimi) selectable in `ais add` and the WebUI, with layered env vars (provider-level + model-group-level), two preset model groups per provider, and a non-destructive one-time upgrade migration.

**Architecture:** A new `src/presets.js` ships provider templates as data. `addAccount` gains a provider picker that, for a preset, prefills a Claude account (apiUrl/customEnv/modelGroups) and only asks for API Key + confirmable Base URL + active group. The Claude generator learns `GROUP_ENV_KEYS` (preserve-only). A `src/migration.js` runs once per version bump (TTY-only) to retrofit the provider env onto existing accounts. The WebUI gets a `/api/presets` endpoint, a provider selector, and a per-model-group "special params" sub-list built with safe DOM APIs (no innerHTML).

**Tech Stack:** Node.js (>=16), Commander.js, Inquirer.js, chalk, plain `assert` test scripts (no test framework exists in-repo; tests run via `node tests/<file>.test.js`).

**Spec:** `docs/superpowers/specs/2026-07-24-preset-providers-design.md`

**Conventions:** This repo has NO test framework (`package.json` "test" = `node src/index.js`). We add lightweight `assert`-based scripts under `tests/`, runnable directly with `node`. Follow existing bilingual (中/英) output and chalk color rules in `CLAUDE.md`. **Security: all new client-side DOM code must use `createElement`/`textContent` (via the `el()` helper) — never `innerHTML` with interpolated values.** Commit after each task.

---

## File Structure

**New files:**
- `src/presets.js` — `PROVIDER_ENV`, `PRESETS`, `getPresets()`, `findPreset(key)`, `findPresetByApiUrl(url)`. Pure data + accessors.
- `src/migration.js` — `findMigrationCandidates(accounts, presets)` (pure, tested) + `maybeRunMigration()` (TTY-gated opt-in prompt + apply).
- `tests/presets.test.js`, `tests/claude-generator.test.js`, `tests/global-config.test.js`, `tests/migration.test.js` — plain `assert` scripts.

**Modified files:**
- `src/constants.js` — add `GROUP_ENV_KEYS`.
- `src/generators/claude-generator.js` — apply group's `GROUP_ENV_KEYS` (preserve-only).
- `src/commands/account.js` — provider picker at top of `addAccount` + new `addAccountFromPreset()`.
- `src/config/global-config.js` — `getMigrationVersion()` / `setMigrationVersion(v)`.
- `src/index.js` — call `maybeRunMigration()` at startup (TTY-gated).
- `src/ui-server.js` — `GET /api/presets`; provider selector + preset apply; safe-DOM model-group builder with "special params" sub-list; collect group env in `saveAccount`; i18n keys.
- `package.json` — version `1.12.1` → `1.13.0`.
- `README.md` — document presets.

---

## Task 1: Add `GROUP_ENV_KEYS` constant

**Files:**
- Modify: `src/constants.js`

- [ ] **Step 1: Add the constant**

In `src/constants.js`, after the `MODEL_KEYS` array (around line 43), add:

```js
// Environment variable keys managed per model-group (preserve-only on regen).
// Add new group-scoped env keys here (release-time maintenance).
const GROUP_ENV_KEYS = [
  'CLAUDE_CODE_AUTO_COMPACT_WINDOW',
  'ENABLE_TOOL_SEARCH'
];
```

Add `GROUP_ENV_KEYS` to the `module.exports` object (near `MODEL_KEYS`).

- [ ] **Step 2: Verify it loads**

Run: `node -e "const c=require('./src/constants'); console.log(c.GROUP_ENV_KEYS)"`
Expected: `[ 'CLAUDE_CODE_AUTO_COMPACT_WINDOW', 'ENABLE_TOOL_SEARCH' ]`

- [ ] **Step 3: Commit**

```bash
git add src/constants.js
git commit -m "feat(constants): add GROUP_ENV_KEYS for model-group-scoped env"
```

---

## Task 2: Create `src/presets.js` (data + accessors)

**Files:**
- Create: `src/presets.js`
- Create: `tests/presets.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/presets.test.js`:

```js
const assert = require('assert');
const { PRESETS, PROVIDER_ENV, getPresets, findPreset, findPresetByApiUrl } = require('../src/presets');

assert.strictEqual(PROVIDER_ENV.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS, '1', 'BETAS must be 1');
assert.ok(!('ENABLE_TOOL_SEARCH' in PROVIDER_ENV), 'ENABLE_TOOL_SEARCH must NOT be provider-level');

const keys = PRESETS.map(p => p.key);
for (const k of ['glm', 'minimax', 'qwen', 'kimi']) {
  assert.ok(keys.includes(k), `missing preset ${k}`);
}

for (const p of PRESETS) {
  assert.strictEqual(p.type, 'Claude', `${p.key} type must be Claude`);
  assert.strictEqual(p.defaultActiveGroup, 'latest', `${p.key} default active must be latest`);
  assert.ok(p.modelGroups.latest && p.modelGroups.balanced, `${p.key} needs latest+balanced groups`);
  assert.strictEqual(p.modelGroups.latest.config.ENABLE_TOOL_SEARCH, '0', `${p.key} latest needs ENABLE_TOOL_SEARCH=0`);
  assert.strictEqual(p.customEnv.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS, '1', `${p.key} needs BETAS=1`);
}

const glm = findPreset('glm');
assert.strictEqual(glm.modelGroups.latest.config.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '1000000');
assert.strictEqual(glm.modelGroups.balanced.config.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'glm-5');
for (const p of ['minimax', 'qwen', 'kimi']) {
  const cfg = findPreset(p).modelGroups.latest.config;
  assert.ok(!('CLAUDE_CODE_AUTO_COMPACT_WINDOW' in cfg), `${p} must NOT set AUTO_COMPACT_WINDOW`);
}

assert.strictEqual(findPreset('nope'), null);
assert.strictEqual(findPresetByApiUrl('https://open.bigmodel.cn/api/anthropic').key, 'glm');
assert.strictEqual(findPresetByApiUrl('https://not-a-preset.example.com'), null);
assert.strictEqual(getPresets().length, PRESETS.length);

console.log('presets.test.js OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/presets.test.js`
Expected: FAIL — `Cannot find module '../src/presets'`

- [ ] **Step 3: Write `src/presets.js`**

Create `src/presets.js`:

```js
/**
 * Built-in Claude-protocol (Anthropic-compatible) provider presets.
 * Shipped data, maintained at release time (new provider / version upgrade).
 */
const PROVIDER_ENV = {
  CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1' // every provider needs this
};

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
  {
    key: 'minimax',
    name: 'MiniMax',
    type: 'Claude',
    apiUrl: 'https://api.minimax.io/anthropic',
    description: 'MiniMax (Anthropic 协议兼容)',
    customEnv: { ...PROVIDER_ENV },
    modelGroups: {
      latest:   { label: '全部最新模型', config: { DEFAULT_MODEL: 'MiniMax-M2.7', ENABLE_TOOL_SEARCH: '0' } },
      balanced: { label: '合理均衡配置', config: { DEFAULT_MODEL: 'MiniMax-M2.7', ENABLE_TOOL_SEARCH: '0' } }
    },
    defaultActiveGroup: 'latest'
  },
  {
    key: 'qwen',
    name: '通义千问 (Qwen)',
    type: 'Claude',
    apiUrl: 'https://dashscope.aliyuncs.com/apps/anthropic',
    description: '阿里云百炼 Qwen (Anthropic 协议兼容,仅 /v1/messages)',
    customEnv: { ...PROVIDER_ENV },
    modelGroups: {
      latest:   { label: '全部最新模型', config: { DEFAULT_MODEL: 'qwen3-coder-plus', ENABLE_TOOL_SEARCH: '0' } },
      balanced: { label: '合理均衡配置', config: { DEFAULT_MODEL: 'qwen3-coder-plus', ENABLE_TOOL_SEARCH: '0' } }
    },
    defaultActiveGroup: 'latest'
  },
  {
    key: 'kimi',
    name: 'Kimi (Moonshot)',
    type: 'Claude',
    apiUrl: 'https://api.moonshot.ai/anthropic',
    description: 'Kimi Moonshot (Anthropic 协议兼容)',
    customEnv: { ...PROVIDER_ENV },
    modelGroups: {
      latest:   { label: '全部最新模型', config: { DEFAULT_MODEL: 'kimi-k3', ENABLE_TOOL_SEARCH: '0' } },
      balanced: { label: '合理均衡配置', config: { DEFAULT_MODEL: 'kimi-k3', ANTHROPIC_DEFAULT_HAIKU_MODEL: 'kimi-k2', ENABLE_TOOL_SEARCH: '0' } }
    },
    defaultActiveGroup: 'latest'
  }
];

function getPresets() {
  return PRESETS.map(p => ({ ...p }));
}

function findPreset(key) {
  const p = PRESETS.find(x => x.key === key);
  return p ? { ...p } : null;
}

function findPresetByApiUrl(apiUrl) {
  if (!apiUrl) return null;
  const p = PRESETS.find(x => x.apiUrl === apiUrl);
  return p ? { ...p } : null;
}

module.exports = { PROVIDER_ENV, PRESETS, getPresets, findPreset, findPresetByApiUrl };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/presets.test.js`
Expected: `presets.test.js OK`

- [ ] **Step 5: Commit**

```bash
git add src/presets.js tests/presets.test.js
git commit -m "feat(presets): add built-in Claude-protocol provider presets"
```

---

## Task 3: Generator applies `GROUP_ENV_KEYS` (preserve-only)

**Files:**
- Modify: `src/generators/claude-generator.js`
- Create: `tests/claude-generator.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/claude-generator.test.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ClaudeGenerator = require('../src/generators/claude-generator');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ais-gen-'));
}
function readEnv(dir) {
  const f = path.join(dir, '.claude', 'settings.local.json');
  return JSON.parse(fs.readFileSync(f, 'utf8')).env;
}

// GLM latest: all tiers fall back to DEFAULT_MODEL; group env applied
{
  const dir = tmpDir();
  const g = new ClaudeGenerator(dir);
  g.generate({
    apiKey: 'sk-glm',
    apiUrl: 'https://open.bigmodel.cn/api/anthropic',
    customEnv: { CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1' },
    modelGroups: {
      latest:   { DEFAULT_MODEL: 'glm-5.2[1m]', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000', ENABLE_TOOL_SEARCH: '0' },
      balanced: { DEFAULT_MODEL: 'glm-5.2[1m]', ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-5', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000', ENABLE_TOOL_SEARCH: '0' }
    },
    activeModelGroup: 'latest'
  });
  const env = readEnv(dir);
  assert.strictEqual(env.ANTHROPIC_AUTH_TOKEN, 'sk-glm');
  assert.strictEqual(env.ANTHROPIC_BASE_URL, 'https://open.bigmodel.cn/api/anthropic');
  assert.strictEqual(env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS, '1');
  assert.strictEqual(env.DEFAULT_MODEL, 'glm-5.2[1m]');
  assert.strictEqual(env.ANTHROPIC_DEFAULT_OPUS_MODEL, 'glm-5.2[1m]', 'opus falls back to DEFAULT_MODEL');
  assert.strictEqual(env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'glm-5.2[1m]', 'latest haiku falls back');
  assert.strictEqual(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '1000000');
  assert.strictEqual(env.ENABLE_TOOL_SEARCH, '0');
}

// GLM balanced: haiku override honored
{
  const dir = tmpDir();
  const g = new ClaudeGenerator(dir);
  g.generate({
    apiKey: 'sk-glm',
    apiUrl: 'https://open.bigmodel.cn/api/anthropic',
    customEnv: {},
    modelGroups: {
      latest:   { DEFAULT_MODEL: 'glm-5.2[1m]' },
      balanced: { DEFAULT_MODEL: 'glm-5.2[1m]', ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-5', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000' }
    },
    activeModelGroup: 'balanced'
  });
  const env = readEnv(dir);
  assert.strictEqual(env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'glm-5', 'balanced haiku override');
  assert.strictEqual(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '1000000');
}

// Preserve-only: existing AUTO_COMPACT_WINDOW survives when active group does NOT define it
{
  const dir = tmpDir();
  const g = new ClaudeGenerator(dir);
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'settings.local.json'),
    JSON.stringify({ env: { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '500000', FOO: 'bar' } }));
  g.generate({
    apiKey: 'sk-x',
    apiUrl: '',
    customEnv: {},
    modelGroups: { latest: { DEFAULT_MODEL: 'qwen3-coder-plus' } },
    activeModelGroup: 'latest'
  });
  const env = readEnv(dir);
  assert.strictEqual(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '500000', 'preserve pre-existing group env');
  assert.strictEqual(env.FOO, 'bar', 'preserve unrelated env');
  assert.strictEqual(env.DEFAULT_MODEL, 'qwen3-coder-plus');
}

console.log('claude-generator.test.js OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/claude-generator.test.js`
Expected: FAIL — `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` is `undefined`.

- [ ] **Step 3: Modify the generator**

In `src/generators/claude-generator.js`:

1. Change the top require (line 8) from `const { MODEL_KEYS, CONFIG_FILES } = require('../constants');` to:
```js
const { MODEL_KEYS, CONFIG_FILES, GROUP_ENV_KEYS } = require('../constants');
```

2. In `_applyModelConfig`, inside the `if (activeGroup && typeof activeGroup === 'object')` block, AFTER the `MODEL_KEYS.slice(1).forEach(...)` loop, add:
```js
        // Apply group-level env (preserve-only): set only keys the active group defines.
        // Keys the group does NOT define are left untouched in existingConfig.env (non-destructive).
        GROUP_ENV_KEYS.forEach(gKey => {
          if (activeGroup[gKey] !== undefined) {
            claudeConfig.env[gKey] = activeGroup[gKey];
          }
        });
```

3. In the `else if (account.modelConfig ...)` backward-compat block, after its `MODEL_KEYS.slice(1).forEach(...)` loop, add the same loop referencing `account.modelConfig`:
```js
      GROUP_ENV_KEYS.forEach(gKey => {
        if (account.modelConfig[gKey] !== undefined) {
          claudeConfig.env[gKey] = account.modelConfig[gKey];
        }
      });
```

(The clean step ~lines 30-35 already preserves everything except `MODEL_KEYS`, so `GROUP_ENV_KEYS` in existing env are retained unless overwritten by the active group — intended preserve-only behavior.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/claude-generator.test.js`
Expected: `claude-generator.test.js OK`

- [ ] **Step 5: Commit**

```bash
git add src/generators/claude-generator.js tests/claude-generator.test.js
git commit -m "feat(generator): apply model-group GROUP_ENV_KEYS (preserve-only)"
```

---

## Task 4: CLI provider picker in `ais add`

**Files:**
- Modify: `src/commands/account.js`

- [ ] **Step 1: Add the provider picker at the top of `addAccount`**

The current `addAccount(name, options)` begins with `// If name not provided, prompt for it`. Insert the provider picker **before** that block:

```js
async function addAccount(name, options) {
    // Provider selection: built-in Claude-protocol presets or Custom (all types)
    const { PRESETS, findPreset } = require("../presets");
    const providerChoices = [
        ...PRESETS.map((p) => ({
            name: `${p.name}  ${chalk.gray(p.apiUrl)}`,
            value: p.key,
        })),
        { name: "自定义 Custom (手动配置, 所有类型)", value: "__custom__" },
    ];
    const { provider } = await inquirer.prompt([
        {
            type: "list",
            name: "provider",
            message: "选择提供商 Select provider:",
            choices: providerChoices,
        },
    ]);

    if (provider !== "__custom__") {
        return addAccountFromPreset(findPreset(provider), name);
    }

    // If name not provided, prompt for it
    if (!name) {
```

Leave the rest of the existing `addAccount` body unchanged (it now serves the Custom path).

- [ ] **Step 2: Add `addAccountFromPreset()`**

Append this function above `module.exports` in `account.js`:

```js
/**
 * Create a Claude account from a built-in preset.
 * Asks only for API Key + confirmable Base URL + active model group.
 */
async function addAccountFromPreset(preset, name) {
    const labels = {
        latest: preset.modelGroups.latest.label,
        balanced: preset.modelGroups.balanced.label,
    };

    console.log(chalk.bold.cyan(`\n📋 ${preset.name} 预设 (Preset)`));
    console.log(chalk.gray(`   Base URL: ${preset.apiUrl}`));
    console.log(chalk.gray(`   模型组: ${labels.balanced}(balanced) / ${labels.latest}(latest)`));
    console.log(
        chalk.gray(
            `   环境变量: ${Object.keys(preset.customEnv).map((k) => `${k}=${preset.customEnv[k]}`).join(", ")}`
        )
    );
    const groupEnvSample = Object.keys(preset.modelGroups.latest.config)
        .filter((k) => !["DEFAULT_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL", "ANTHROPIC_MODEL"].includes(k))
        .join(", ");
    if (groupEnvSample) console.log(chalk.gray(`   组级参数(示例): ${groupEnvSample}`));
    console.log("");

    if (!name) {
        const ans = await inquirer.prompt([
            {
                type: "input",
                name: "accountName",
                message: "账号名称 Account name:",
                default: preset.key,
                validate: (input) => input.trim() !== "" || "Name is required",
            },
        ]);
        name = ans.accountName.trim();
    }

    if (config.accountExists(name)) {
        const { overwrite } = await inquirer.prompt([
            { type: "confirm", name: "overwrite", message: `账号 '${name}' 已存在,是否覆盖? Overwrite?`, default: false },
        ]);
        if (!overwrite) {
            console.log(chalk.yellow("Operation cancelled. (操作已取消。)"));
            return;
        }
    }

    const { apiKey } = await inquirer.prompt([
        { type: "password", name: "apiKey", message: "API Key:", mask: "*", validate: (input) => input.trim() !== "" || "API Key is required" },
    ]);

    const { apiUrl } = await inquirer.prompt([
        { type: "input", name: "apiUrl", message: "Base URL (可直接回车确认,或修改):", default: preset.apiUrl, validate: (input) => input.trim() !== "" || "Base URL is required" },
    ]);

    const modelGroups = {
        latest: { ...preset.modelGroups.latest.config },
        balanced: { ...preset.modelGroups.balanced.config },
    };
    const { active } = await inquirer.prompt([
        {
            type: "list",
            name: "active",
            message: "激活模型组 Active model group:",
            choices: [
                { name: `${labels.latest} (latest)`, value: "latest" },
                { name: `${labels.balanced} (balanced)`, value: "balanced" },
                { name: "➕ 新建自定义模型组 (custom)", value: "__custom__" },
            ],
            default: preset.defaultActiveGroup,
        },
    ]);
    let activeModelGroup = active;
    if (active === "__custom__") {
        const { customGroupName } = await inquirer.prompt([
            { type: "input", name: "customGroupName", message: "自定义模型组名称 Group name:", default: "custom", validate: (input) => input.trim() !== "" || "Name is required" },
        ]);
        const cfg = await promptForModelGroup();
        if (Object.keys(cfg).length === 0) {
            console.log(chalk.yellow("⚠ 未提供配置,使用 balanced 作为活动组。"));
            activeModelGroup = "balanced";
        } else {
            modelGroups[customGroupName.trim()] = cfg;
            activeModelGroup = customGroupName.trim();
        }
    }

    const { email, description } = await inquirer.prompt([
        { type: "input", name: "email", message: "邮箱 Email (optional):", default: "" },
        { type: "input", name: "description", message: "描述 Description (optional):", default: preset.description },
    ]);

    const accountData = {
        type: "Claude",
        apiKey: apiKey.trim(),
        apiUrl: apiUrl.trim(),
        email: email.trim(),
        description: description.trim(),
        customEnv: { ...preset.customEnv },
        modelGroups,
        activeModelGroup,
    };

    config.addAccount(name, accountData);
    console.log(chalk.green(`\n✓ Account '${name}' added from ${preset.name} preset!`));
    console.log(chalk.cyan(`✓ Active model group (活动模型组): ${activeModelGroup}\n`));
    console.log(chalk.cyan(`💡 Tip (提示): 使用 "ais model add/use/list" 管理模型组;使用 "ais use ${name}" 切换到此账号。\n`));
}
```

Add `addAccountFromPreset` to `module.exports` in `account.js`.

- [ ] **Step 3: Manual test (interactive)**

```bash
node src/index.js add
```
Choose GLM, provide any key, confirm base URL, pick `latest`. Expected: overview printed, then `✓ Account '<name>' added from GLM 智谱 preset!`. Verify storage:
```bash
node -e "const c=require('./src/config'); console.log(JSON.stringify(new c().getAccount('<name>'), null, 2))"
```
Expected: `type:"Claude"`, GLM apiUrl, `customEnv.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS:"1"`, `modelGroups.latest/.balanced` present, `activeModelGroup:"latest"`.

Choose `自定义 Custom` → original full add flow (type prompt) appears unchanged. Clean up: `node src/index.js rm <name>`.

- [ ] **Step 4: Commit**

```bash
git add src/commands/account.js
git commit -m "feat(cli): provider picker in ais add with preset application"
```

---

## Task 5: Migration version tracking in global-config

**Files:**
- Modify: `src/config/global-config.js`
- Create: `tests/global-config.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/global-config.test.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const GlobalConfigManager = require('../src/config/global-config');

const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-home-'));
process.env.HOME = fakeHome;
process.env.USERPROFILE = fakeHome;

const g = new GlobalConfigManager();
assert.strictEqual(g.getMigrationVersion(), null, 'default version is null');
g.setMigrationVersion('1.13.0');
assert.strictEqual(g.getMigrationVersion(), '1.13.0', 'version round-trips');
const cfg = g.read();
assert.ok(cfg.accounts, 'accounts intact');
assert.strictEqual(typeof cfg.nextAccountId, 'number');

console.log('global-config.test.js OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/global-config.test.js`
Expected: FAIL — `g.getMigrationVersion is not a function`.

- [ ] **Step 3: Add the methods**

In `src/config/global-config.js`, add before `getConfigPaths()`:

```js
  getMigrationVersion() {
    const config = this.read();
    return (config.migration && config.migration.lastRunVersion) || null;
  }

  setMigrationVersion(version) {
    const config = this.read();
    config.migration = { ...(config.migration || {}), lastRunVersion: version };
    this.save(config);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/global-config.test.js`
Expected: `global-config.test.js OK`

- [ ] **Step 5: Commit**

```bash
git add src/config/global-config.js tests/global-config.test.js
git commit -m "feat(global-config): migration version tracking"
```

---

## Task 6: Migration candidate detection + opt-in runner

**Files:**
- Create: `src/migration.js`
- Create: `tests/migration.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/migration.test.js`:

```js
const assert = require('assert');
const { findMigrationCandidates } = require('../src/migration');
const { PRESETS } = require('../src/presets');

const accounts = {
  oldGlm: { type: 'Claude', apiUrl: 'https://open.bigmodel.cn/api/anthropic', customEnv: {} },
  glmWithGroups: { type: 'Claude', apiUrl: 'https://open.bigmodel.cn/api/anthropic', customEnv: { CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1' }, modelGroups: { x: {} } },
  okCustom: { type: 'Claude', apiUrl: 'https://my-own.example.com', customEnv: { CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1' } },
  codex: { type: 'Codex', apiUrl: 'x', customEnv: {} }
};

const c = findMigrationCandidates(accounts, PRESETS);

assert.ok(c.needsBetas.includes('oldGlm'), 'oldGlm needs BETAS');
assert.ok(!c.needsBetas.includes('glmWithGroups'), 'glmWithGroups already has BETAS');
assert.ok(!c.needsBetas.includes('codex'), 'codex ignored');
assert.strictEqual(c.presetMatch.length, 1);
assert.strictEqual(c.presetMatch[0].name, 'oldGlm');
assert.strictEqual(c.presetMatch[0].preset.key, 'glm');

console.log('migration.test.js OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/migration.test.js`
Expected: FAIL — `Cannot find module '../src/migration'`.

- [ ] **Step 3: Write `src/migration.js`**

Create `src/migration.js`:

```js
/**
 * One-time, opt-in upgrade migration (design §8.2, option B).
 * Non-interactive / non-TTY: does nothing.
 * Interactive + version bump: scans Claude accounts and offers to retrofit
 * CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS (always) and preset model groups
 * (only when apiUrl matches a preset AND the account has no modelGroups).
 */
const chalk = require('chalk');
const inquirer = require('inquirer');
const ConfigManager = require('./config');
const { PRESETS } = require('./presets');

const BETAS = 'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS';

function findMigrationCandidates(accounts, presets) {
  const needsBetas = [];
  const presetMatch = [];
  Object.entries(accounts || {}).forEach(([name, acc]) => {
    if (!acc || acc.type !== 'Claude') return;
    const hasBetas = !!(acc.customEnv && acc.customEnv[BETAS]);
    if (!hasBetas) needsBetas.push(name);
    if (acc.apiUrl) {
      const preset = presets.find((p) => p.apiUrl === acc.apiUrl);
      if (preset) {
        const hasGroups = !!(acc.modelGroups && Object.keys(acc.modelGroups).length > 0);
        if (!hasGroups) presetMatch.push({ name, preset });
      }
    }
  });
  return { needsBetas, presetMatch };
}

function applyBetas(config, name) {
  const acc = config.getAccount(name);
  if (!acc) return false;
  acc.customEnv = { ...(acc.customEnv || {}) };
  if (acc.customEnv[BETAS]) return false;
  acc.customEnv[BETAS] = '1';
  config.addAccount(name, acc);
  return true;
}

function applyPresetGroups(config, name, preset) {
  const acc = config.getAccount(name);
  if (!acc) return false;
  if (acc.modelGroups && Object.keys(acc.modelGroups).length > 0) return false;
  acc.modelGroups = {
    latest: { ...preset.modelGroups.latest.config },
    balanced: { ...preset.modelGroups.balanced.config },
  };
  acc.activeModelGroup = preset.defaultActiveGroup;
  config.addAccount(name, acc);
  return true;
}

async function maybeRunMigration() {
  if (!process.stdout.isTTY) return; // never prompt / never silently modify

  const config = new ConfigManager();
  const currentVersion = require('../package.json').version;
  const last = config.globalConfig.getMigrationVersion();
  if (last && last === currentVersion) return;

  const accounts = config.getAllAccounts();
  const { needsBetas, presetMatch } = findMigrationCandidates(accounts, PRESETS);

  const totalCandidates = new Set([...needsBetas, ...presetMatch.map((m) => m.name)]).size;
  if (totalCandidates === 0) {
    config.globalConfig.setMigrationVersion(currentVersion);
    return;
  }

  console.log(chalk.bold.cyan('\n🔄 升级迁移检查 (Upgrade migration)'));
  console.log(chalk.gray(`检测到 ${totalCandidates} 个 Claude 账号可补充推荐配置(非破坏、只加不删)。`));
  if (needsBetas.length) console.log(chalk.gray(`   • 补充 ${BETAS}=1: ${needsBetas.join(', ')}`));
  presetMatch.forEach((m) => console.log(chalk.gray(`   • 套用预设模型组 (${m.preset.name}): ${m.name}`)));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '是否补充?',
      choices: [
        { name: '全部补充 Apply all', value: 'all' },
        { name: '逐个选择 Choose', value: 'choose' },
        { name: '跳过 Skip', value: 'skip' },
      ],
      default: 'skip',
    },
  ]);

  if (action === 'skip') {
    config.globalConfig.setMigrationVersion(currentVersion);
    console.log(chalk.yellow('已跳过 (skipped)。'));
    return;
  }

  for (const name of needsBetas) {
    if (action === 'all' || (await confirmSingle(name, '补充 BETAS'))) {
      applyBetas(config, name);
      console.log(chalk.green(`✓ ${name}: +${BETAS}=1`));
    }
  }
  for (const m of presetMatch) {
    if (action === 'all' || (await confirmSingle(m.name, `套用 ${m.preset.name} 预设模型组`))) {
      applyPresetGroups(config, m.name, m.preset);
      console.log(chalk.green(`✓ ${m.name}: 套用 ${m.preset.name} 模型组`));
    }
  }

  config.globalConfig.setMigrationVersion(currentVersion);
  console.log(chalk.green('迁移完成 (migration done)。\n'));
}

async function confirmSingle(name, label) {
  const { ok } = await inquirer.prompt([
    { type: 'confirm', name: 'ok', message: `${name} — ${label}?`, default: false },
  ]);
  return ok;
}

module.exports = { findMigrationCandidates, applyBetas, applyPresetGroups, maybeRunMigration };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/migration.test.js`
Expected: `migration.test.js OK`

- [ ] **Step 5: Commit**

```bash
git add src/migration.js tests/migration.test.js
git commit -m "feat(migration): opt-in upgrade migration (provider env + preset groups)"
```

---

## Task 7: Call migration at CLI startup

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Wire the startup call**

`src/index.js` currently ends with `program.parse(process.argv);` + a help-if-empty block. Replace that tail with an async main that runs migration first (TTY-gated inside `maybeRunMigration`):

```js
const { maybeRunMigration } = require('./migration');
(async () => {
  try {
    await maybeRunMigration();
  } catch (err) {
    console.error(chalk.yellow(`⚠ Migration check skipped: ${err.message}`));
  }
  program.parseAsync(process.argv).then(() => {
    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }
  });
})();
```

- [ ] **Step 2: Manual test — non-TTY does nothing**

```bash
node src/index.js list | cat
```
Expected: normal `list` output, no migration prompt (stdout not a TTY when piped).

- [ ] **Step 3: Manual test — version bump triggers prompt (interactive)**

```bash
TMPHOME=$(mktemp -d)
HOME=$TMPHOME node -e "const c=require('./src/config'); const cm=new c(); cm.globalConfig.setMigrationVersion('0.0.1'); cm.addAccount('old', {type:'Claude', apiUrl:'https://open.bigmodel.cn/api/anthropic', apiKey:'sk-x', customEnv:{}})"
HOME=$TMPHOME node src/index.js list
```
Expected: migration prompt detects `old`, offers BETAS + GLM preset groups. Choose Skip. Re-run no longer prompts. Clean up: `rm -rf $TMPHOME`.

- [ ] **Step 4: Commit**

```bash
git add src/index.js
git commit -m "feat(cli): run opt-in migration check at startup"
```

---

## Task 8: WebUI backend — `GET /api/presets`

**Files:**
- Modify: `src/ui-server.js`

- [ ] **Step 1: Add the route**

In the route dispatcher (~line 91), insert a presets branch **before** the `/api/accounts` GET branch:

```js
    if (pathname === '/api/presets' && req.method === 'GET') {
      const { getPresets } = require('./presets');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getPresets()));
      return;
    } else if (pathname === '/api/accounts' && req.method === 'GET') {
```

- [ ] **Step 2: Manual test**

```bash
cd $(mktemp -d) && node <repo>/src/index.js ui &
sleep 2
curl -s http://127.0.0.1:<printed-port>/api/presets | head -c 300
```
Expected: JSON array with the four presets (`key`, `name`, `apiUrl`, `modelGroups`, `defaultActiveGroup`). Kill the server afterward.

- [ ] **Step 3: Commit**

```bash
git add src/ui-server.js
git commit -m "feat(ui): GET /api/presets endpoint"
```

---

## Task 9: WebUI — safe-DOM model-group builder with "special params"

This task replaces the two duplicated model-group templates (which assigned HTML strings) with one safe builder using `createElement`/`textContent`, and adds the per-group "special params" (group-level env) sub-list. **No `innerHTML`.**

**Files:**
- Modify: `src/ui-server.js`

- [ ] **Step 1: Add a safe `el()` DOM helper**

Add near the top of the client `<script>` (e.g., right after `let modelGroupCount = 0;` ~line 2521):

```js
        // Safe DOM helper: create an element without innerHTML (XSS-safe).
        // attrs: { className, type, value, placeholder, style, id, onClick (fn), ... }
        // children: string | Node | Array of either
        function el(tag, attrs, children) {
            const node = document.createElement(tag);
            (attrs && Object.entries(attrs) || []).forEach(([k, v]) => {
                if (v == null) return;
                if (k === 'className') node.className = v;
                else if (k === 'style') node.style.cssText = v;
                else if (/^on[A-Z]/.test(k) && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
                else node.setAttribute(k, v);
            });
            (Array.isArray(children) ? children : [children]).forEach(c => {
                if (c == null) return;
                node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            });
            return node;
        }
```

- [ ] **Step 2: Add `buildModelGroupItem(groupId, groupName, cfg, isActive)` (returns a Node)**

Add next to `el()`:

```js
        const MODEL_KEY_NAMES = ['DEFAULT_MODEL','ANTHROPIC_DEFAULT_OPUS_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL','CLAUDE_CODE_SUBAGENT_MODEL','ANTHROPIC_MODEL'];
        const MODEL_GROUP_FIELDS = [
            ['groupDefaultModel', 'defaultModel', 'DEFAULT_MODEL', null],
            ['groupOpusModel', null, 'ANTHROPIC_DEFAULT_OPUS_MODEL', 'claude-opus-4-20250514'],
            ['groupSonnetModel', null, 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'claude-sonnet-4-5-20250929'],
            ['groupHaikuModel', null, 'ANTHROPIC_DEFAULT_HAIKU_MODEL', 'claude-3-5-haiku-20241022'],
            ['groupSubagentModel', null, 'CLAUDE_CODE_SUBAGENT_MODEL', 'claude-sonnet-4-5-20250929'],
            ['groupAnthropicModel', null, 'ANTHROPIC_MODEL', 'claude-sonnet-4-5-20250929'],
        ];

        function buildModelGroupItem(groupId, groupName, cfg, isActive) {
            const fieldsDiv = el('div', { className: 'model-group-fields' });
            MODEL_GROUP_FIELDS.forEach(([idSuffix, i18nKey, key, ph]) => {
                const label = i18nKey ? t(i18nKey) : key;
                const phVal = ph || (i18nKey ? t('defaultModelPlaceholder') : '');
                fieldsDiv.appendChild(el('div', {}, [
                    el('label', {}, [label]),
                    el('input', { type: 'text', id: idSuffix + groupId, value: cfg[key] || '', placeholder: phVal }),
                ]));
            });
            // Special params (group-level env) section
            fieldsDiv.appendChild(el('div', { className: 'group-env-section', style: 'margin-top:8px;border-top:1px dashed #ccc;padding-top:8px;' }, [
                el('label', { style: 'font-size:12px;color:#666;' }, ['特殊参数 Special params (KEY=VALUE)']),
                el('div', { id: 'groupEnvList' + groupId }),
                el('button', { type: 'button', className: 'btn btn-secondary btn-small', onClick: () => addGroupEnvVarUI(groupId) }, ['+ 添加参数']),
            ]));

            return el('div', { className: 'model-group-item', id: 'modelGroup' + groupId }, [
                el('input', { type: 'hidden', id: 'groupName' + groupId, value: groupName }),
                el('div', { className: 'model-group-header' }, [
                    el('div', { className: 'model-group-name' }, [
                        document.createTextNode(groupName + ' '),
                        el('span', { className: 'active-badge', id: 'activeBadge' + groupId, style: 'display:' + (isActive ? 'inline-block' : 'none') }, ['Active']),
                    ]),
                    el('div', { className: 'model-group-actions' }, [
                        el('button', { type: 'button', className: 'btn btn-secondary btn-small', onClick: () => setActiveModelGroup(groupId) }, [t('setActive')]),
                        el('button', { type: 'button', className: 'btn btn-danger btn-small', onClick: () => removeModelGroupUI(groupId) }, ['×']),
                    ]),
                ]),
                fieldsDiv,
            ]);
        }
```

- [ ] **Step 3: Add `addGroupEnvVarUI(groupId, key, value)` (safe DOM)**

Add near `addEnvVar` (~line 3082):

```js
        function addGroupEnvVarUI(groupId, key, value) {
            const list = document.getElementById('groupEnvList' + groupId);
            if (!list) return;
            const row = el('div', { className: 'group-env-item', style: 'display:flex;gap:6px;margin-top:4px;' }, [
                el('input', { type: 'text', className: 'group-env-key', placeholder: 'KEY', value: key || '' }),
                el('input', { type: 'text', className: 'group-env-value', placeholder: 'VALUE', value: value || '' }),
            ]);
            const removeBtn = el('button', { type: 'button', className: 'btn btn-danger btn-small' }, ['×']);
            removeBtn.addEventListener('click', () => row.remove());
            row.appendChild(removeBtn);
            list.appendChild(row);
        }
```

- [ ] **Step 4: Rewrite `addModelGroupUI` to use the builder + render special params**

Replace the current `addModelGroupUI` (line 3113, which uses `prompt()` + HTML-string template) with:

```js
        function addModelGroupUI(groupNameArg, configArg) {
            const groupName = groupNameArg != null ? groupNameArg : prompt(t('modelGroupName') + ':');
            if (!groupName || !groupName.trim()) return null;

            const groupId = modelGroupCount++;
            const container = document.getElementById('modelGroupsList');
            const isFirst = container.children.length === 0;
            if (isFirst) activeModelGroup = groupId;

            const cfg = configArg || {};
            const div = buildModelGroupItem(groupId, groupName, cfg, isFirst);
            container.appendChild(div);

            // Render group-level (special) env rows preset in cfg
            Object.keys(cfg)
                .filter(k => !MODEL_KEY_NAMES.includes(k))
                .forEach(k => addGroupEnvVarUI(groupId, k, cfg[k]));

            return groupId;
        }
```

(The manual "+ 添加模型组" button still calls `addModelGroupUI()` with no args → prompt path.)

- [ ] **Step 5: Rewrite the edit-mode rendering to use the builder**

In the edit-mode `Object.entries(account.modelGroups).forEach(...)` block (~line 3011-3062), replace the `const div = document.createElement('div'); ... div.innerHTML = \`...\`; container.appendChild(div);` sequence with:

```js
                    const div = buildModelGroupItem(groupId, groupName, groupConfig, isActive);
                    container.appendChild(div);
                    // Render existing special params for this group
                    Object.keys(groupConfig)
                        .filter(k => !MODEL_KEY_NAMES.includes(k))
                        .forEach(k => addGroupEnvVarUI(groupId, k, groupConfig[k]));
```

Keep the surrounding `forEach`, `isActive`, and `activeModelGroup = groupId` logic unchanged.

- [ ] **Step 6: Collect group env in `saveAccount`**

In `saveAccount`'s Claude branch, the per-group collection ends (~line 3299) with the MODEL_KEYS assignments then `accountData.modelGroups[groupName] = groupConfig;`. Insert before that assignment:

```js
                item.querySelectorAll('.group-env-item').forEach(envItem => {
                    const ek = envItem.querySelector('.group-env-key').value.trim();
                    const ev = envItem.querySelector('.group-env-value').value.trim();
                    if (ek && ev && !MODEL_KEY_NAMES.includes(ek)) groupConfig[ek] = ev;
                });
                accountData.modelGroups[groupName] = groupConfig;
```

(`MODEL_KEY_NAMES` is defined at module scope in Step 2.)

- [ ] **Step 7: Commit**

```bash
git add src/ui-server.js
git commit -m "refactor(ui): safe-DOM model-group builder with special-params (group env)"
```

---

## Task 10: WebUI — provider selector + preset application

**Files:**
- Modify: `src/ui-server.js` (modal HTML + JS + i18n)

- [ ] **Step 1: Add provider `<select>` + hint to the modal HTML**

In the modal HTML (~line 1915), the form begins with the `accountName` form-group. Insert a provider form-group **before** it:

```html
            <form id="accountForm" onsubmit="saveAccount(event)">
                <div class="form-group">
                    <label for="providerPreset" data-i18n="provider">提供商 Provider</label>
                    <select id="providerPreset" onchange="applyPreset()">
                        <option value="__custom__" data-i18n="customProvider">自定义 Custom</option>
                    </select>
                    <small id="presetHint" style="color: #666; display: none; margin-top: 5px;"></small>
                </div>
                <div class="form-group">
```

- [ ] **Step 2: Make `showAddModal` async; populate providers + focus API key**

Change `function showAddModal()` (~line 2918) to `async function showAddModal()`. At its end, just before `document.getElementById('accountModal').classList.add('active');`, add:

```js
            await loadProviderPresets();
            document.getElementById('providerPreset').value = '__custom__';
            document.getElementById('presetHint').style.display = 'none';
            document.getElementById('accountType').disabled = false;
            setTimeout(() => document.getElementById('apiKey').focus(), 50);
```

- [ ] **Step 3: Add `loadProviderPresets()` and `applyPreset()`**

Add near `addModelGroupUI`:

```js
        let PRESETS_CACHE = [];
        async function loadProviderPresets() {
            const sel = document.getElementById('providerPreset');
            if (PRESETS_CACHE.length === 0) {
                try {
                    PRESETS_CACHE = await (await fetch('/api/presets')).json();
                } catch (e) { PRESETS_CACHE = []; }
                PRESETS_CACHE.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.key;
                    opt.textContent = p.name; // safe
                    sel.appendChild(opt);
                });
            }
        }

        function applyPreset() {
            const key = document.getElementById('providerPreset').value;
            const hint = document.getElementById('presetHint');
            if (key === '__custom__') {
                hint.style.display = 'none';
                document.getElementById('accountType').disabled = false;
                return;
            }
            const preset = PRESETS_CACHE.find(p => p.key === key);
            if (!preset) return;

            const typeSel = document.getElementById('accountType');
            typeSel.value = 'Claude';
            typeSel.disabled = true;
            toggleModelFields();

            document.getElementById('apiUrl').value = preset.apiUrl;
            if (preset.description) document.getElementById('description').value = preset.description;
            if (!document.getElementById('accountName').value) document.getElementById('accountName').value = preset.key;

            const envList = document.getElementById('envVarsList');
            envList.innerHTML = '';
            Object.entries(preset.customEnv || {}).forEach(([k, v]) => addEnvVar(k, v));

            const mgList = document.getElementById('modelGroupsList');
            mgList.innerHTML = '';
            modelGroupCount = 0;
            activeModelGroup = null;
            ['latest', 'balanced'].forEach(gk => {
                const def = preset.modelGroups[gk];
                if (!def) return;
                const id = addModelGroupUI(def.label || gk, def.config || {});
                if (gk === (preset.defaultActiveGroup || 'latest') && id != null) setActiveModelGroup(id);
            });
            document.getElementById('advancedContent').classList.add('expanded');
            document.getElementById('advancedToggleIcon').classList.add('expanded');

            hint.style.display = 'block';
            hint.textContent = '💡 已套用 ' + preset.name + ' 预设,所有字段均可修改 — 只需填写 API Key';
        }
```

(`addEnvVar` already exists; it is safe to keep as-is since env values come from shipped preset data. If you want extra hardening, switch its `innerHTML` to `el()` too — optional, not required for shipped-data path.)

- [ ] **Step 4: Add i18n keys**

In the Chinese translations object (~line 2277) add:
```js
                provider: '提供商 Provider',
                customProvider: '自定义 Custom',
```
In the English translations object (~line 2397) add:
```js
                provider: 'Provider',
                customProvider: 'Custom',
```

- [ ] **Step 5: Manual test**

`node src/index.js ui` (temp dir), open Add modal:
- Provider dropdown lists `自定义 Custom` + 4 presets.
- Select GLM: type locks Claude, apiUrl fills, customEnv shows BETAS=1, two model groups (latest active), each with special-params section (GLM shows AUTO_COMPACT_WINDOW + ENABLE_TOOL_SEARCH), hint shows, API Key focused.
- Back to 自定义: type re-enabled.
- Save with a key → account appears with correct apiUrl/model groups. Edit it → groups + special params round-trip.

- [ ] **Step 6: Commit**

```bash
git add src/ui-server.js
git commit -m "feat(ui): provider selector with preset application"
```

---

## Task 11: Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document presets**

Add to `README.md` after the account-management section:

````markdown
## 预设 Claude 协议 Provider / Preset Providers

`ais add` 第一步可选择内置的 **Claude 协议(Anthropic 兼容)预设**:

| Provider | Base URL | 最新模型 |
|---|---|---|
| GLM 智谱 | `https://open.bigmodel.cn/api/anthropic` | `glm-5.2[1m]` |
| MiniMax | `https://api.minimax.io/anthropic` | `MiniMax-M2.7` |
| 通义千问 Qwen | `https://dashscope.aliyuncs.com/apps/anthropic` | `qwen3-coder-plus` |
| Kimi (Moonshot) | `https://api.moonshot.ai/anthropic` | `kimi-k3` |

选择预设后只需填写 **API Key** 并确认/修改 **Base URL**,即创建配置合理的 Claude 账号:
- **Provider 级环境变量**(所有预设):`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`
- **模型组级参数**(随活动模型组):如 GLM 的 `CLAUDE_CODE_AUTO_COMPACT_WINDOW=1000000`、`ENABLE_TOOL_SEARCH=0`
- 每个预设含 `latest`(全最新)与 `balanced`(haiku 用便宜档)两个模型组,默认 active=`latest`
- 预设只是起点,所有字段(含模型组、特殊参数)均可修改,也可用 `ais model add` 新增自定义模型组

> 环境变量分层:provider 级写入账号 `customEnv`;模型组级写入模型组配置(`GROUP_ENV_KEYS`),生成器**保留式**处理(只覆盖模型组定义的键,绝不删除用户手动设置的值)。
> Web UI 同样支持预设(添加账号弹窗顶部「提供商」下拉)。
> 升级迁移:首次运行新版本时(交互式终端)一次性提示是否为旧 Claude 账号补充推荐配置,非破坏、默认不改。
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document preset providers and layered env"
```

---

## Task 12: Version bump

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump version**

In `package.json` change `"version": "1.12.1",` to `"version": "1.13.0",`.

- [ ] **Step 2: Verify**

Run: `node src/index.js --version`
Expected: `1.13.0`

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 1.13.0"
```

---

## Final Verification

- [ ] Unit tests:
```bash
node tests/presets.test.js && node tests/claude-generator.test.js && node tests/global-config.test.js && node tests/migration.test.js
```
Expected: all print `... OK`.

- [ ] CLI e2e: `node src/index.js add` → each preset creates a correct account; Custom = original flow.

- [ ] Migration e2e (throwaway HOME, Task 7 Step 3): prompt appears once, applies on consent, no re-prompt.

- [ ] WebUI e2e: presets load; GLM prefill + special params + autofocus + save + edit round-trip.

- [ ] Backward compat: a pre-upgrade account, after `ais use`, regenerates `.claude/settings.local.json` without losing manually-set env.

---

## Self-Review Notes (applied)

- **Spec coverage:** presets (T2), GROUP_ENV_KEYS + generator preserve-only (T1,T3), CLI preset path incl. baseUrl-edit + custom group (T4), migration option B + non-destructive retrofit (T5,T6,T7), WebUI presets + provider selector + model-group special params + round-trip + safe DOM (T8,T9,T10), docs (T11), version (T12).
- **No innerHTML in new code** — `el()` helper + `textContent` (addresses XSS; security hook compliant).
- **Preserve-only** enforced + tested (T3 case 3).
- **Name consistency:** `findPreset`/`findPresetByApiUrl`/`getPresets`; `getMigrationVersion`/`setMigrationVersion`; `buildModelGroupItem`/`addGroupEnvVarUI`/`applyPreset`/`loadProviderPresets`/`el`; `addModelGroupUI(groupNameArg, configArg)` signature used consistently by manual button (no args) and preset path (args).
