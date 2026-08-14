const assert = require('assert');
const {
  versionTuple,
  compareVersionTuples,
  pickModel,
  fetchAvailableModels,
  resolvePresetModels,
  materializeGroups,
} = require('../src/model-discovery');

// --- version comparison (descending order semantics) ---
assert.deepStrictEqual(versionTuple('glm-5.2'), [5, 2]);
assert.deepStrictEqual(versionTuple('MiniMax-M2.7'), [2, 7]);
assert.ok(compareVersionTuples([5, 3], [5, 2]) < 0, '5.3 sorts before 5.2');
assert.ok(compareVersionTuples([5, 2], [5]) < 0, '5.2 sorts before 5');
assert.ok(compareVersionTuples([3], [2, 5]) < 0, 'kimi-k3 sorts before kimi-k2.5');

// --- pick rules ---
const glmModels = ['glm-5', 'glm-5.2-air', 'glm-5.2-flash', 'glm-5.2', 'glm-4.6'];
assert.strictEqual(pickModel(glmModels, { match: '^glm-[0-9.]+$', decorate: '[1m]' }), 'glm-5.2[1m]');
assert.strictEqual(pickModel(glmModels, { match: '^glm-[0-9.]+$', previous: true }), 'glm-5');
// variant suffixes excluded by the anchored pattern; unrelated families ignored
assert.strictEqual(pickModel(['kimi-k2-turbo-preview', 'kimi-k2', 'kimi-k3'], { match: '^kimi-k[0-9.]+$' }), 'kimi-k3');
assert.strictEqual(pickModel(['moonshot-v1-8k'], { match: '^kimi-k[0-9.]+$' }), null);
// case-insensitive flag + exclude substrings
assert.strictEqual(pickModel(['MiniMax-M2', 'minimax-m2.7'], { match: '^MiniMax-M[0-9.]+$', flags: 'i' }), 'minimax-m2.7');
assert.strictEqual(pickModel(['m-1', 'm-1-preview'], { match: '^m-[0-9.]+$', exclude: ['preview'] }), 'm-1');
// previous with a single candidate falls back to it
assert.strictEqual(pickModel(['glm-5.2'], { match: '^glm-[0-9.]+$', previous: true }), 'glm-5.2');

// --- fetch shapes (injected fetch) ---
const openAI = { data: [{ id: 'glm-5.2' }, { id: 'glm-5' }] };
const anthropic = { data: [{ id: 'glm-5.2', display_name: 'GLM' }], has_more: false };
const okFetch = (payload) => async (url, opts) => {
  assert.match(url, /\/v1\/models$/);
  assert.ok(opts.headers.Authorization === 'Bearer sk-test' || opts.headers['x-api-key'] === 'sk-test');
  return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
};

(async () => {
  const disc = { modelsUrl: 'https://x.example/v1/models', auth: 'bearer' };
  assert.deepStrictEqual(await fetchAvailableModels(disc, 'sk-test', { fetchImpl: okFetch(openAI) }), ['glm-5.2', 'glm-5']);
  await fetchAvailableModels(disc, 'sk-test', { fetchImpl: okFetch(anthropic) });
  await fetchAvailableModels(disc, 'sk-test', { fetchImpl: okFetch(['glm-5.2']) });

  // x-api-key auth header
  await fetchAvailableModels(
    { modelsUrl: 'https://x.example/v1/models', auth: 'x-api-key' },
    'sk-test',
    {
      fetchImpl: async (u, o) => {
        assert.strictEqual(o.headers['x-api-key'], 'sk-test');
        return { ok: true, status: 200, text: async () => JSON.stringify(['glm-5.2']) };
      },
    }
  );

  // failures throw so callers can fall back
  await assert.rejects(fetchAvailableModels(disc, 'k', { fetchImpl: async () => ({ ok: false, status: 401, text: async () => '' }) }));
  await assert.rejects(fetchAvailableModels(disc, 'k', { fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ hello: 1 }) }) }));
  await assert.rejects(fetchAvailableModels(disc, 'k', { fetchImpl: async () => { throw new Error('down'); } }));

  // --- resolvePresetModels ---
  const preset = {
    discovery: {
      modelsUrl: 'https://x.example/v1/models',
      auth: 'bearer',
      fallback: { latest: 'glm-5.2[1m]', haiku: 'glm-5' },
      pick: {
        latest: { match: '^glm-[0-9.]+$', decorate: '[1m]' },
        haiku: { match: '^glm-[0-9.]+$', previous: true },
      },
    },
  };

  const live = await resolvePresetModels(preset, 'sk-test', {
    fetchImpl: okFetch({ data: [{ id: 'glm-5.3' }, { id: 'glm-5.2' }] }),
  });
  assert.strictEqual(live.source, 'live');
  assert.strictEqual(live.values.latest, 'glm-5.3[1m]');
  assert.strictEqual(live.values.haiku, 'glm-5.2');

  const down = await resolvePresetModels(preset, 'sk', {
    fetchImpl: async () => { throw new Error('network down'); },
  });
  assert.strictEqual(down.source, 'fallback');
  assert.strictEqual(down.values.latest, 'glm-5.2[1m]');
  assert.strictEqual(down.values.haiku, 'glm-5');

  assert.strictEqual((await resolvePresetModels(preset, '')).source, 'fallback', 'no key → fallback');
  const none = await resolvePresetModels({ modelGroups: {} }, 'sk');
  assert.strictEqual(none.source, 'fallback', 'no discovery → fallback');
  assert.deepStrictEqual(none.values, {});

  // --- materializeGroups ---
  const rawPreset = {
    modelGroups: {
      latest: { label: 'L', config: { DEFAULT_MODEL: '$latest', ENABLE_TOOL_SEARCH: '0' } },
      balanced: { label: 'B', config: { DEFAULT_MODEL: '$latest', ANTHROPIC_DEFAULT_HAIKU_MODEL: '$haiku' } },
    },
    discovery: { fallback: { latest: 'glm-5.2[1m]', haiku: 'glm-5' } },
  };
  const g = materializeGroups(rawPreset);
  assert.strictEqual(g.latest.config.DEFAULT_MODEL, 'glm-5.2[1m]');
  assert.strictEqual(g.latest.config.ENABLE_TOOL_SEARCH, '0');
  assert.strictEqual(g.balanced.config.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'glm-5');
  assert.strictEqual(g.latest.label, 'L');
  assert.strictEqual(rawPreset.modelGroups.latest.config.DEFAULT_MODEL, '$latest', 'input not mutated');

  const liveGroups = materializeGroups(rawPreset, { latest: 'glm-5.3[1m]', haiku: 'glm-5.2' });
  assert.strictEqual(liveGroups.latest.config.DEFAULT_MODEL, 'glm-5.3[1m]');
  assert.strictEqual(liveGroups.balanced.config.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'glm-5.2');

  // unmapped placeholder stays visible instead of writing garbage silently
  const weird = materializeGroups({ modelGroups: { g1: { config: { DEFAULT_MODEL: '$nope' } } } });
  assert.strictEqual(weird.g1.config.DEFAULT_MODEL, '$nope');

  console.log('model-discovery.test.js OK');
})();
