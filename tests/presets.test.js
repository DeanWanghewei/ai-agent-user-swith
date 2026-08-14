const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolate from the user's real registry cache so assertions are deterministic.
process.env.AIS_TEST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-presets-test-'));

const { PRESETS, PROVIDER_ENV, getPresets, findPreset, findPresetByApiUrl, findRawPreset, mergePresets } = require('../src/presets');

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

// Raw built-ins use placeholders for discoverable providers; concrete names otherwise.
assert.strictEqual(PRESETS.find(p => p.key === 'glm').modelGroups.latest.config.DEFAULT_MODEL, '$latest');
assert.strictEqual(PRESETS.find(p => p.key === 'qwen').modelGroups.latest.config.DEFAULT_MODEL, 'qwen3-coder-plus');

// Materialized presets resolve placeholders from discovery.fallback — no leaks.
const glm = findPreset('glm');
assert.strictEqual(glm.modelGroups.latest.config.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '1000000');
assert.strictEqual(glm.modelGroups.latest.config.DEFAULT_MODEL, 'glm-5.3');
assert.strictEqual(glm.modelGroups.balanced.config.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'glm-5.2');
assert.strictEqual(findRawPreset('glm').modelGroups.latest.config.DEFAULT_MODEL, '$latest', 'raw preset keeps placeholders');
for (const p of ['minimax', 'qwen', 'kimi']) {
  const cfg = findPreset(p).modelGroups.latest.config;
  assert.ok(!('CLAUDE_CODE_AUTO_COMPACT_WINDOW' in cfg), `${p} must NOT set AUTO_COMPACT_WINDOW`);
}
for (const p of getPresets()) {
  for (const g of Object.values(p.modelGroups)) {
    for (const v of Object.values(g.config)) {
      assert.ok(!/^\$\w+$/.test(v), `${p.key} leaked placeholder ${v}`);
    }
  }
}

assert.strictEqual(findPreset('nope'), null);
assert.strictEqual(findPresetByApiUrl('https://open.bigmodel.cn/api/anthropic').key, 'glm');
assert.strictEqual(findPresetByApiUrl('https://not-a-preset.example.com'), null);
assert.strictEqual(getPresets().length, PRESETS.length);

// Registry overlay: per-key fields win, built-in extras kept, new providers appended.
const merged = mergePresets(PRESETS, [
  { key: 'glm', modelGroups: { latest: { label: 'L9', config: { DEFAULT_MODEL: 'glm-9' } }, balanced: { label: 'B9', config: {} } } },
  { key: 'deepseek', name: 'DeepSeek', type: 'Claude', apiUrl: 'https://ds.example', modelGroups: { latest: { label: 'L', config: {} }, balanced: { label: 'B', config: {} } } },
]);
const mGlm = merged.find(p => p.key === 'glm');
assert.strictEqual(mGlm.modelGroups.latest.config.DEFAULT_MODEL, 'glm-9', 'registry modelGroups win');
assert.strictEqual(mGlm.name, 'GLM 智谱', 'registry entry without name keeps built-in name');
assert.ok(mGlm.discovery, 'glm keeps built-in discovery config');
assert.strictEqual(merged.find(p => p.key === 'qwen').modelGroups.latest.config.DEFAULT_MODEL, 'qwen3-coder-plus', 'non-overlaid presets kept');
assert.ok(merged.find(p => p.key === 'deepseek'), 'registry-only provider appended');
assert.strictEqual(merged.length, PRESETS.length + 1);
assert.strictEqual(mergePresets(PRESETS, []).length, PRESETS.length, 'empty overlay is a no-op');

fs.rmSync(process.env.AIS_TEST_HOME, { recursive: true, force: true });
console.log('presets.test.js OK');
