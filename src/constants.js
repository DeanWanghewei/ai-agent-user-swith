/**
 * Constants for AI Account Switch (AIS)
 * Centralized constants definition for the entire application
 */

// Wire API modes for Codex accounts
const WIRE_API_MODES = {
  CHAT: 'chat',
  RESPONSES: 'responses',
  ENV: 'env'
};

const DEFAULT_WIRE_API = WIRE_API_MODES.CHAT;

// Account types
const ACCOUNT_TYPES = {
  CLAUDE: 'Claude',
  CODEX: 'Codex',
  CCR: 'CCR',
  DROIDS: 'Droids'
};

// Account type values as array (for iteration)
const ACCOUNT_TYPE_VALUES = ['Claude', 'Codex', 'CCR', 'Droids', 'Other'];

// MCP server scopes
const MCP_SCOPES = {
  LOCAL: 'local',      // Only available in current project
  PROJECT: 'project',  // Shared with project members via .mcp.json
  USER: 'user'         // Available to all projects for current user (global)
};

const DEFAULT_MCP_SCOPE = MCP_SCOPES.LOCAL;

// Model-related environment variable keys
const MODEL_KEYS = [
  'DEFAULT_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'ANTHROPIC_MODEL'
];

// Configuration file names
const CONFIG_FILES = {
  GLOBAL_DIR: '.ai-account-switch',
  GLOBAL_CONFIG: 'config.json',
  PROJECT_CONFIG: '.ais-project-config',
  CLAUDE_DIR: '.claude',
  CLAUDE_LOCAL_CONFIG: 'settings.local.json',
  CLAUDE_USER_CONFIG: 'settings.json',
  CODEX_DIR: '.codex',
  CODEX_CONFIG: 'config.toml',
  CODEX_AUTH: 'auth.json',
  CODEX_PROFILE: '.codex-profile',
  CCR_DIR: '.claude-code-router',
  CCR_CONFIG: 'config.json',
  DROIDS_DIR: '.droids',
  DROIDS_CONFIG: 'config.json',
  MCP_CONFIG: '.mcp.json'
};

// Default CCR port
const DEFAULT_CCR_PORT = 3456;

// Gitignore entries for AIS
const GITIGNORE_ENTRIES = [
  CONFIG_FILES.PROJECT_CONFIG,
  `${CONFIG_FILES.CLAUDE_DIR}/${CONFIG_FILES.CLAUDE_LOCAL_CONFIG}`,
  CONFIG_FILES.CODEX_PROFILE,
  `${CONFIG_FILES.DROIDS_DIR}/${CONFIG_FILES.DROIDS_CONFIG}`
];

module.exports = {
  WIRE_API_MODES,
  DEFAULT_WIRE_API,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_VALUES,
  MCP_SCOPES,
  DEFAULT_MCP_SCOPE,
  MODEL_KEYS,
  CONFIG_FILES,
  DEFAULT_CCR_PORT,
  GITIGNORE_ENTRIES
};
