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
