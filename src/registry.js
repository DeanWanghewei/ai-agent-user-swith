/**
 * Remote presets registry client.
 *
 * The repo-root presets.registry.json is the runtime source of preset data:
 * updating model names there (one commit to main) reaches all users within the
 * cache TTL, without an npm release. Design constraint (hard requirement):
 * a user who cannot reach the registry must be able to keep using the tool
 * exactly as before — every network failure, timeout or malformed payload is
 * swallowed and falls back to the local cache or the built-in presets.
 *
 * Cache: ~/.ai-account-switch/presets.cache.json ({fetchedAt, presets}).
 * Env overrides:
 *   AIS_PRESETS_REGISTRY_URL — custom URL(s), comma-separated; "off"/"disabled"
 *                              disables all network access.
 *   AIS_TEST_HOME            — redirect the cache directory (used by tests).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { CONFIG_FILES } = require('./constants');

// Source order: raw GitHub tracks the main branch directly (freshest — a
// registry commit reaches users within the TTL without any release); the
// jsDelivr npm mirror tracks npm dist-tag @latest (lags until a release, but
// is reachable where raw.githubusercontent.com is blocked, e.g. mainland
// China). Note: jsDelivr's /gh/ endpoint no longer accepts branch refs.
const DEFAULT_REGISTRY_URLS = [
  'https://raw.githubusercontent.com/DeanWanghewei/ai-agent-user-swith/main/presets.registry.json',
  'https://cdn.jsdelivr.net/npm/ai-account-switch@latest/presets.registry.json',
];
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // refresh at most once per day
const DEFAULT_TIMEOUT_MS = 3000; // never make the user wait on a slow registry
const MAX_REGISTRY_BYTES = 512 * 1024;

function homeDir() {
  return process.env.AIS_TEST_HOME || os.homedir();
}

function cachePath() {
  return path.join(homeDir(), CONFIG_FILES.GLOBAL_DIR, 'presets.cache.json');
}

function getRegistryUrls() {
  const env = (process.env.AIS_PRESETS_REGISTRY_URL || '').trim();
  if (!env) return DEFAULT_REGISTRY_URLS;
  if (env === 'off' || env === 'disabled') return [];
  return env.split(',').map((u) => u.trim()).filter(Boolean);
}

function isValidPresetsList(arr) {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((p) => p && typeof p === 'object' && typeof p.key === 'string' && p.key &&
      typeof p.modelGroups === 'object' && p.modelGroups !== null)
  );
}

function readCache() {
  try {
    const entry = JSON.parse(fs.readFileSync(cachePath(), 'utf8'));
    if (entry && typeof entry.fetchedAt === 'number' && isValidPresetsList(entry.presets)) {
      return entry;
    }
  } catch {
    // missing or corrupt cache is a normal state — fall through to null
  }
  return null;
}

/**
 * Lenient read: returns whatever tracking info exists (presets may be absent).
 * `lastAttemptAt` backs off network retries for a full TTL after a failure,
 * so offline users wait at most one bounded attempt per day instead of
 * stalling every command.
 */
function readCacheMeta() {
  try {
    const entry = JSON.parse(fs.readFileSync(cachePath(), 'utf8'));
    if (entry && typeof entry === 'object') return entry;
  } catch {
    // no cache yet
  }
  return {};
}

function isFresh(entry, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
  return !!entry && now - entry.fetchedAt < ttlMs;
}

function validateRegistryPayload(json, now = Date.now()) {
  if (!json || typeof json !== 'object' || !isValidPresetsList(json.presets)) return null;
  return { presets: json.presets, fetchedAt: now, lastAttemptAt: now };
}

async function fetchOne(url, timeoutMs, fetchImpl) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(url, {
      signal: controller ? controller.signal : undefined,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_REGISTRY_BYTES) throw new Error('registry too large');
    return JSON.parse(text);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Best-effort refresh of the presets cache. Returns the freshest cache entry
 * available (possibly stale, possibly null). NEVER throws and never blocks
 * longer than timeoutMs per URL.
 */
async function ensureFresh(options = {}) {
  const {
    ttlMs = DEFAULT_TTL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    force = false,
    now = Date.now(),
  } = options;
  const cached = readCache();
  const meta = readCacheMeta();
  const urls = getRegistryUrls();
  if (urls.length === 0) return cached; // network access disabled via env
  if (!force && isFresh(cached, now, ttlMs)) return cached;
  // Back off after a failed attempt for a full TTL — an unreachable registry
  // must not add latency to every command (hard requirement).
  if (!force && typeof meta.lastAttemptAt === 'number' && now - meta.lastAttemptAt < ttlMs) {
    return cached;
  }

  const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl) return cached; // runtime without fetch — keep local data

  for (const url of urls) {
    try {
      const entry = validateRegistryPayload(await fetchOne(url, timeoutMs, fetchImpl), now);
      if (entry) {
        try {
          fs.mkdirSync(path.dirname(cachePath()), { recursive: true });
          fs.writeFileSync(cachePath(), JSON.stringify(entry, null, 2), 'utf8');
        } catch {
          // cache write failure is harmless — in-memory result still returned
        }
        return entry;
      }
    } catch {
      // try the next URL; total failure falls back to the (stale) cache
    }
  }
  try {
    fs.mkdirSync(path.dirname(cachePath()), { recursive: true });
    fs.writeFileSync(cachePath(), JSON.stringify({ ...meta, lastAttemptAt: now }, null, 2), 'utf8');
  } catch {
    // backoff marker is best-effort too
  }
  return cached;
}

module.exports = {
  DEFAULT_REGISTRY_URLS,
  DEFAULT_TTL_MS,
  cachePath,
  getRegistryUrls,
  readCache,
  readCacheMeta,
  isFresh,
  validateRegistryPayload,
  ensureFresh,
};
