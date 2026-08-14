const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolate the cache away from the user's real ~/.ai-account-switch.
process.env.AIS_TEST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-registry-test-'));

const registry = require('../src/registry');

const VALID = {
  version: 1,
  presets: [
    { key: 'glm', name: 'GLM', type: 'Claude', apiUrl: 'https://x.example', modelGroups: { latest: { label: 'L', config: { DEFAULT_MODEL: 'glm-9' } } } },
  ],
};

const okFetch = (payload, calls) => async (url) => {
  calls.push(url);
  return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
};

(async () => {
  // --- payload validation ---
  assert.ok(registry.validateRegistryPayload(VALID));
  assert.strictEqual(registry.validateRegistryPayload({ presets: [] }), null);
  assert.strictEqual(registry.validateRegistryPayload({ presets: [{}] }), null);
  assert.strictEqual(registry.validateRegistryPayload({ presets: 'x' }), null);
  assert.strictEqual(registry.validateRegistryPayload(null), null);

  // --- url resolution via env ---
  assert.deepStrictEqual(registry.getRegistryUrls(), registry.DEFAULT_REGISTRY_URLS, 'defaults without env');
  process.env.AIS_PRESETS_REGISTRY_URL = 'https://mirror.example/r.json, https://mirror2.example/r.json';
  assert.deepStrictEqual(registry.getRegistryUrls(), ['https://mirror.example/r.json', 'https://mirror2.example/r.json']);
  process.env.AIS_PRESETS_REGISTRY_URL = 'off';
  assert.deepStrictEqual(registry.getRegistryUrls(), [], 'off disables network');
  delete process.env.AIS_PRESETS_REGISTRY_URL;

  // --- no cache initially ---
  assert.strictEqual(registry.readCache(), null);

  // --- successful fetch writes cache ---
  process.env.AIS_PRESETS_REGISTRY_URL = 'https://registry.example/x.json';
  let calls = [];
  let entry = await registry.ensureFresh({ fetchImpl: okFetch(VALID, calls) });
  assert.strictEqual(entry.presets[0].key, 'glm');
  assert.strictEqual(calls.length, 1);
  assert.ok(registry.readCache(), 'cache file written');

  // --- fresh cache short-circuits network ---
  calls = [];
  entry = await registry.ensureFresh({ fetchImpl: okFetch(VALID, calls) });
  assert.strictEqual(calls.length, 0, 'no fetch while cache fresh');
  assert.strictEqual(entry.presets[0].key, 'glm');

  // --- force bypasses TTL ---
  calls = [];
  entry = await registry.ensureFresh({ force: true, fetchImpl: okFetch(VALID, calls) });
  assert.strictEqual(calls.length, 1);

  // --- second URL used when the first fails ---
  process.env.AIS_PRESETS_REGISTRY_URL = 'https://a.example/1.json,https://b.example/2.json';
  entry = await registry.ensureFresh({
    force: true,
    fetchImpl: async (url) =>
      url.includes('a.example')
        ? { ok: false, status: 500, text: async () => '' }
        : { ok: true, status: 200, text: async () => JSON.stringify(VALID) },
  });
  assert.strictEqual(entry.presets[0].key, 'glm', 'fell back to second URL');

  // --- stale cache + total network failure → stale cache, never throws ---
  fs.writeFileSync(
    registry.cachePath(),
    JSON.stringify({ fetchedAt: Date.now() - 48 * 3600 * 1000, presets: VALID.presets })
  );
  entry = await registry.ensureFresh({ fetchImpl: async () => { throw new Error('network down'); } });
  assert.strictEqual(entry.presets[0].key, 'glm', 'stale cache still served');

  // --- backoff: after a failed attempt, no retry within the TTL ---
  const backoffCalls = [];
  entry = await registry.ensureFresh({ fetchImpl: okFetch(VALID, backoffCalls) });
  assert.strictEqual(backoffCalls.length, 0, 'no retry after recent failure');
  assert.strictEqual(entry.presets[0].key, 'glm', 'stale cache served during backoff');

  // --- malformed payloads never make it into the cache ---
  const bogusFetch = (payload) => async () => ({ ok: true, status: 200, text: async () => JSON.stringify(payload) });
  entry = await registry.ensureFresh({ force: true, fetchImpl: bogusFetch({ presets: [] }) });
  assert.strictEqual(entry.presets[0].key, 'glm', 'bogus registry ignored, cache kept');
  entry = await registry.ensureFresh({ force: true, fetchImpl: bogusFetch({ presets: [{ nokey: true, modelGroups: {} }] }) });
  assert.strictEqual(entry.presets[0].key, 'glm', 'invalid preset entry rejected');

  // --- "off" never touches the network ---
  process.env.AIS_PRESETS_REGISTRY_URL = 'off';
  calls = [];
  entry = await registry.ensureFresh({ force: true, fetchImpl: okFetch(VALID, calls) });
  assert.strictEqual(calls.length, 0);
  assert.ok(entry, 'local cache still returned');
  delete process.env.AIS_PRESETS_REGISTRY_URL;

  // --- corrupt cache file tolerated ---
  fs.writeFileSync(registry.cachePath(), '{not valid json');
  assert.strictEqual(registry.readCache(), null);
  entry = await registry.ensureFresh({ fetchImpl: async () => { throw new Error('down'); } });
  assert.strictEqual(entry, null, 'no cache and no network → null, caller uses built-ins');

  fs.rmSync(process.env.AIS_TEST_HOME, { recursive: true, force: true });
  console.log('registry.test.js OK');
})();
