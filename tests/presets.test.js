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
