/**
 * Built-in Claude-protocol (Anthropic-compatible) provider presets.
 *
 * Model names use placeholders ($latest / $haiku) that are resolved at apply
 * time by src/model-discovery.js — live from the provider's /v1/models when
 * reachable (with the user's API key), otherwise from discovery.fallback here.
 * Providers without a model-list endpoint (Qwen) keep concrete model names.
 *
 * A remote registry (presets.registry.json at the repo root, cached by
 * src/registry.js) overlays these built-ins: updating model names there
 * reaches users within 24h without an npm release. The registry is optional —
 * when unreachable, everything falls back to the data below, and users can
 * always edit model groups manually (ais model add / WebUI).
 */
const registry = require('./registry');
const { materializeGroups } = require('./model-discovery');

const PROVIDER_ENV = {
  CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '1' // every provider needs this
};

const BUILTIN_PRESETS = [
  {
    key: 'glm',
    name: 'GLM 智谱',
    type: 'Claude',
    apiUrl: 'https://open.bigmodel.cn/api/anthropic',
    description: '智谱 GLM (Anthropic 协议兼容)',
    customEnv: { ...PROVIDER_ENV },
    modelGroups: {
      latest:   { label: '全部最新模型', config: { DEFAULT_MODEL: '$latest', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000', ENABLE_TOOL_SEARCH: '0' } },
      balanced: { label: '合理均衡配置', config: { DEFAULT_MODEL: '$latest', ANTHROPIC_DEFAULT_HAIKU_MODEL: '$haiku', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '1000000', ENABLE_TOOL_SEARCH: '0' } }
    },
    defaultActiveGroup: 'latest',
    discovery: {
      modelsUrl: 'https://open.bigmodel.cn/api/anthropic/v1/models',
      auth: 'bearer',
      fallback: { latest: 'glm-5.3', haiku: 'glm-5.2' },
      pick: {
        latest: { match: '^glm-[0-9.]+$' },
        haiku:  { match: '^glm-[0-9.]+$', previous: true }
      }
    }
  },
  {
    key: 'minimax',
    name: 'MiniMax',
    type: 'Claude',
    apiUrl: 'https://api.minimax.io/anthropic',
    description: 'MiniMax (Anthropic 协议兼容)',
    customEnv: { ...PROVIDER_ENV },
    modelGroups: {
      latest:   { label: '全部最新模型', config: { DEFAULT_MODEL: '$latest', ENABLE_TOOL_SEARCH: '0' } },
      balanced: { label: '合理均衡配置', config: { DEFAULT_MODEL: '$latest', ENABLE_TOOL_SEARCH: '0' } }
    },
    defaultActiveGroup: 'latest',
    discovery: {
      modelsUrl: 'https://api.minimax.io/anthropic/v1/models',
      auth: 'bearer',
      fallback: { latest: 'MiniMax-M2.7' },
      pick: {
        latest: { match: '^MiniMax-M[0-9.]+$', flags: 'i' }
      }
    }
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
    // no discovery: DashScope has no model-list endpoint; registry-only maintenance
  },
  {
    key: 'kimi',
    name: 'Kimi (Moonshot)',
    type: 'Claude',
    apiUrl: 'https://api.moonshot.ai/anthropic',
    description: 'Kimi Moonshot (Anthropic 协议兼容)',
    customEnv: { ...PROVIDER_ENV },
    modelGroups: {
      latest:   { label: '全部最新模型', config: { DEFAULT_MODEL: '$latest', ENABLE_TOOL_SEARCH: '0' } },
      balanced: { label: '合理均衡配置', config: { DEFAULT_MODEL: '$latest', ANTHROPIC_DEFAULT_HAIKU_MODEL: '$haiku', ENABLE_TOOL_SEARCH: '0' } }
    },
    defaultActiveGroup: 'latest',
    discovery: {
      modelsUrl: 'https://api.moonshot.ai/v1/models',
      auth: 'bearer',
      fallback: { latest: 'kimi-k3', haiku: 'kimi-k2' },
      pick: {
        latest: { match: '^kimi-k[0-9.]+$' },
        haiku:  { match: '^kimi-k[0-9.]+$', previous: true }
      }
    }
  }
];

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

/**
 * Overlay registry presets onto the built-ins, per provider key.
 * Registry fields win per-field (modelGroups / discovery replaced wholesale
 * when present); built-in providers absent from the registry are kept;
 * registry-only providers are appended — new providers can ship via registry.
 */
function mergePresets(builtin, overlay) {
  if (!Array.isArray(overlay) || overlay.length === 0) return builtin.map(clone);
  const overlayByKey = new Map(overlay.map((p) => [p.key, p]));
  const merged = builtin.map((b) => {
    const o = overlayByKey.get(b.key);
    if (!o) return clone(b);
    overlayByKey.delete(b.key);
    const m = { ...clone(b), ...clone(o) };
    m.modelGroups = (o && o.modelGroups) || b.modelGroups;
    m.customEnv = (o && o.customEnv) || b.customEnv;
    if (o && o.discovery !== undefined) m.discovery = o.discovery;
    return m;
  });
  overlayByKey.forEach((o) => merged.push(clone(o)));
  return merged;
}

/** Raw presets (placeholders unresolved) with the local registry cache applied. */
function effectivePresets() {
  const cached = registry.readCache();
  return cached ? mergePresets(BUILTIN_PRESETS, cached.presets) : BUILTIN_PRESETS.map(clone);
}

/**
 * Best-effort refresh of the remote registry cache (never throws, never blocks
 * beyond a few seconds), then return the materialized preset list.
 */
async function ensureFreshPresets(options = {}) {
  try {
    await registry.ensureFresh(options);
  } catch {
    // requirement: registry unreachability must never break anything
  }
  return getPresets();
}

/** Presets with placeholder model names resolved from discovery.fallback. */
function getPresets() {
  return effectivePresets().map((p) => ({ ...clone(p), modelGroups: materializeGroups(p) }));
}

function findPreset(key) {
  const p = effectivePresets().find((x) => x.key === key);
  return p ? { ...clone(p), modelGroups: materializeGroups(p) } : null;
}

function findPresetByApiUrl(apiUrl) {
  if (!apiUrl) return null;
  const p = effectivePresets().find((x) => x.apiUrl === apiUrl);
  return p ? { ...clone(p), modelGroups: materializeGroups(p) } : null;
}

/** Unmaterialized preset (placeholders intact) — for live resolution flows. */
function findRawPreset(key) {
  const p = effectivePresets().find((x) => x.key === key);
  return p ? clone(p) : null;
}

module.exports = {
  PROVIDER_ENV,
  PRESETS: BUILTIN_PRESETS, // raw built-ins; prefer getPresets() for concrete model names
  mergePresets,
  effectivePresets,
  getPresets,
  findPreset,
  findPresetByApiUrl,
  findRawPreset,
  ensureFreshPresets,
};
