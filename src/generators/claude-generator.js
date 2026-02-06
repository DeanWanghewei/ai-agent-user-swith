/**
 * Claude Configuration Generator
 * Generates .claude/settings.local.json for Claude Code
 */
const fs = require('fs');
const path = require('path');
const BaseGenerator = require('./base-generator');
const { MODEL_KEYS, CONFIG_FILES } = require('../constants');

class ClaudeGenerator extends BaseGenerator {
  constructor(projectRoot) {
    super(projectRoot);
    this.claudeDir = path.join(this.projectRoot, CONFIG_FILES.CLAUDE_DIR);
    this.claudeConfigFile = path.join(this.claudeDir, CONFIG_FILES.CLAUDE_LOCAL_CONFIG);
  }

  /**
   * Generate Claude Code .claude/settings.local.json configuration
   */
  generate(account, options = {}) {
    this.ensureDir(this.claudeDir);

    // Read existing config if it exists
    const existingConfig = this.readJsonFile(this.claudeConfigFile, {});

    // Build Claude configuration - preserve existing env but clear model configs
    const existingEnv = existingConfig.env || {};
    const cleanedEnv = {};

    // Copy all existing env vars except model-related ones
    Object.keys(existingEnv).forEach(key => {
      if (!MODEL_KEYS.includes(key)) {
        cleanedEnv[key] = existingEnv[key];
      }
    });

    const claudeConfig = {
      ...existingConfig,
      env: {
        ...cleanedEnv,
        ANTHROPIC_AUTH_TOKEN: account.apiKey
      }
    };

    // Add API URL if specified
    if (account.apiUrl) {
      claudeConfig.env.ANTHROPIC_BASE_URL = account.apiUrl;
    }

    // Add custom environment variables if specified
    if (account.customEnv && typeof account.customEnv === 'object') {
      Object.keys(account.customEnv).forEach(key => {
        claudeConfig.env[key] = account.customEnv[key];
      });
    }

    // Add model configuration from active model group
    this._applyModelConfig(claudeConfig, account);

    // Preserve existing permissions if any
    if (!claudeConfig.permissions) {
      claudeConfig.permissions = existingConfig.permissions || {
        allow: [],
        deny: [],
        ask: []
      };
    }

    // Add MCP servers if provided
    if (options.mcpServers) {
      claudeConfig.mcpServers = options.mcpServers;
    }

    // Write Claude configuration
    this.writeJsonFile(this.claudeConfigFile, claudeConfig);
  }

  /**
   * Apply model configuration from account
   * @private
   */
  _applyModelConfig(claudeConfig, account) {
    // Add model configuration from active model group
    if (account.modelGroups && account.activeModelGroup) {
      const activeGroup = account.modelGroups[account.activeModelGroup];

      if (activeGroup && typeof activeGroup === 'object') {
        const defaultModel = activeGroup.DEFAULT_MODEL;

        // Set DEFAULT_MODEL if specified
        if (defaultModel) {
          claudeConfig.env.DEFAULT_MODEL = defaultModel;
        }

        // Set other model configs, using DEFAULT_MODEL as fallback if they're not specified
        MODEL_KEYS.slice(1).forEach(key => {
          if (activeGroup[key]) {
            claudeConfig.env[key] = activeGroup[key];
          } else if (defaultModel) {
            claudeConfig.env[key] = defaultModel;
          }
        });
      }
    }
    // Backward compatibility: support old modelConfig structure
    else if (account.modelConfig && typeof account.modelConfig === 'object') {
      const defaultModel = account.modelConfig.DEFAULT_MODEL;

      if (defaultModel) {
        claudeConfig.env.DEFAULT_MODEL = defaultModel;
      }

      MODEL_KEYS.slice(1).forEach(key => {
        if (account.modelConfig[key]) {
          claudeConfig.env[key] = account.modelConfig[key];
        } else if (defaultModel) {
          claudeConfig.env[key] = defaultModel;
        }
      });
    }
  }
}

module.exports = ClaudeGenerator;
