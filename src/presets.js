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
