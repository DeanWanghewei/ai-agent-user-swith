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
