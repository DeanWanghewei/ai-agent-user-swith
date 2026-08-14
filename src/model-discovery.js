/**
 * Runtime model discovery for Claude-protocol presets.
 *
 * Resolves "$latest" / "$haiku" placeholders in preset model groups by asking
 * the provider's model-list endpoint (Anthropic /v1/models or OpenAI-style
 * /v1/models) with the user's API key. Every failure path (no key, no network,
 * endpoint missing, unexpected response shape) falls back to the preset's
 * static discovery.fallback values — discovery must never block usage.
 */
const DEFAULT_FETCH_TIMEOUT_MS = 8000;

/** Extract the numeric segments of a model id, e.g. "glm-5.2" -> [5,2]. */
function versionTuple(name) {
  return String(name).match(/\d+/g).map(Number);
}

/** Compare two version tuples element-wise; longer tuple with equal prefix wins. */
function compareVersionTuples(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] === undefined ? -1 : a[i];
    const bv = b[i] === undefined ? -1 : b[i];
    if (av !== bv) return bv - av; // descending order
  }
  return 0;
}

/**
 * Pick a model from a list according to a rule.
 * rule: { match: regex-source string, flags?: regex flags, exclude?: substrings,
 *         decorate?: suffix appended to the picked id, previous?: pick 2nd-highest }
 */
function pickModel(models, rule) {
  if (!Array.isArray(models) || models.length === 0 || !rule || !rule.match) return null;
  const re = new RegExp(rule.match, rule.flags || '');
  const excludes = (rule.exclude || []).map((x) => String(x).toLowerCase());
  const candidates = models.filter(
    (m) => typeof m === 'string' && re.test(m) && !excludes.some((x) => m.toLowerCase().includes(x))
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => compareVersionTuples(versionTuple(a), versionTuple(b)));
  const picked = rule.previous && candidates.length > 1 ? candidates[1] : candidates[0];
  return rule.decorate ? `${picked}${rule.decorate}` : picked;
}

/**
 * Fetch the list of model ids a key can access.
 * Accepts OpenAI-style {data:[{id}]}, Anthropic-style {data:[{id}]} and plain arrays.
 * Throws on any failure so callers can fall back to static values.
 */
async function fetchAvailableModels(discovery, apiKey, options = {}) {
  if (!discovery || !discovery.modelsUrl || !apiKey) {
    throw new Error('discovery not configured');
  }
  const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl) throw new Error('fetch unavailable');
  const timeoutMs = options.timeoutMs || DEFAULT_FETCH_TIMEOUT_MS;

  const headers = { accept: 'application/json' };
  if (discovery.auth === 'x-api-key') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let json;
  try {
    const res = await fetchImpl(discovery.modelsUrl, {
      headers,
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = JSON.parse(await res.text());
  } finally {
    if (timer) clearTimeout(timer);
  }

  const list = Array.isArray(json) ? json : json && (json.data || json.models);
  if (!Array.isArray(list)) throw new Error('unexpected models payload');
  const ids = list
    .map((m) => (typeof m === 'string' ? m : m && (m.id || m.name)))
    .filter((m) => typeof m === 'string' && m.length > 0);
  if (ids.length === 0) throw new Error('empty models payload');
  return ids;
}

/**
 * Resolve all placeholders of a preset (raw, unmaterialized).
 * Returns { values: {latest: 'glm-5.3[1m]', ...}, source: 'live'|'fallback', reason? }.
 * Never throws.
 */
async function resolvePresetModels(preset, apiKey, options = {}) {
  const discovery = preset && preset.discovery;
  const fallback = (discovery && discovery.fallback) || {};
  const useFallback = (reason) => ({ values: { ...fallback }, source: 'fallback', reason });

  if (!discovery || !discovery.modelsUrl) return useFallback('no-discovery');
  if (!apiKey) return useFallback('no-api-key');

  try {
    const models = await fetchAvailableModels(discovery, apiKey, options);
    const pick = discovery.pick || {};
    const values = {};
    let resolvedAny = false;
    Object.keys(pick).forEach((name) => {
      const picked = pickModel(models, pick[name]);
      if (picked) {
        values[name] = picked;
        resolvedAny = true;
      } else if (fallback[name] !== undefined) {
        values[name] = fallback[name];
      }
    });
    if (!resolvedAny) return useFallback('no-rule-match');
    // The registry fallback can know a NEWER model than the provider's list
    // exposes (e.g. announced but not yet listed, or list lags behind). Take
    // the newer of the two per name; when the provider list is ahead, live
    // wins. Also fill names that only the fallback defines.
    Object.keys(fallback).forEach((name) => {
      const fb = fallback[name];
      if (typeof fb !== 'string') return;
      if (values[name] === undefined) {
        values[name] = fb;
      } else if (compareVersionTuples(versionTuple(fb), versionTuple(values[name])) < 0) {
        values[name] = fb;
      }
    });
    return { values, source: 'live', modelCount: models.length };
  } catch (err) {
    return useFallback(err && err.message ? String(err.message) : 'fetch-failed');
  }
}

/**
 * Substitute "$name" placeholder values in a preset's model groups.
 * resolvedValues (optional) comes from resolvePresetModels; without it the
 * static discovery.fallback map is used, so sync callers always get concrete
 * model names. Placeholders without any mapping are left untouched so an
 * authoring bug stays visible instead of silently writing garbage.
 */
function materializeGroups(preset, resolvedValues) {
  const map = resolvedValues || (preset && preset.discovery && preset.discovery.fallback) || {};
  const groups = {};
  Object.entries((preset && preset.modelGroups) || {}).forEach(([groupName, group]) => {
    const config = {};
    Object.entries((group && group.config) || {}).forEach(([k, v]) => {
      if (typeof v === 'string' && /^\$\w+$/.test(v) && map[v.slice(1)] !== undefined) {
        config[k] = map[v.slice(1)];
      } else {
        config[k] = v;
      }
    });
    groups[groupName] = { label: group && group.label, config };
  });
  return groups;
}

module.exports = {
  versionTuple,
  compareVersionTuples,
  pickModel,
  fetchAvailableModels,
  resolvePresetModels,
  materializeGroups,
};
