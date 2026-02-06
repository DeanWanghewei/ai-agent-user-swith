/**
 * CCR Configuration Generator
 * Generates ~/.claude-code-router/config.json and Claude config for CCR
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const BaseGenerator = require('./base-generator');
const ClaudeGenerator = require('./claude-generator');
const { CONFIG_FILES } = require('../constants');

class CCRGenerator extends BaseGenerator {
  constructor(projectRoot) {
    super(projectRoot);
    this.ccrConfigDir = path.join(os.homedir(), CONFIG_FILES.CCR_DIR);
    this.ccrConfigFile = path.join(this.ccrConfigDir, CONFIG_FILES.CCR_CONFIG);
    this.claudeGenerator = new ClaudeGenerator(projectRoot);
  }

  /**
   * Generate CCR configuration in ~/.claude-code-router/config.json
   */
  generateCCRConfig(account) {
    // Read existing config
    let config = {};
    if (fs.existsSync(this.ccrConfigFile)) {
      const data = fs.readFileSync(this.ccrConfigFile, 'utf8');
      config = JSON.parse(data);
    }

    if (!account.ccrConfig) return;

    const { providerName, models, defaultModel, backgroundModel, thinkModel } = account.ccrConfig;

    // Check if provider exists
    const providerIndex = config.Providers?.findIndex(p => p.name === providerName);

    const provider = {
      api_base_url: account.apiUrl || '',
      api_key: account.apiKey,
      models: models,
      name: providerName
    };

    if (providerIndex >= 0) {
      config.Providers[providerIndex] = provider;
    } else {
      if (!config.Providers) config.Providers = [];
      config.Providers.push(provider);
    }

    // Update Router configuration
    if (!config.Router) config.Router = {};
    config.Router.default = `${providerName},${defaultModel}`;
    config.Router.background = `${providerName},${backgroundModel}`;
    config.Router.think = `${providerName},${thinkModel}`;

    fs.writeFileSync(this.ccrConfigFile, JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * Generate Claude configuration for CCR type accounts
   */
  generateClaudeConfigForCCR(account) {
    const port = this.getCcrPort();

    // Create .claude directory if it doesn't exist
    const claudeDir = path.join(this.projectRoot, CONFIG_FILES.CLAUDE_DIR);
    const claudeConfigFile = path.join(claudeDir, CONFIG_FILES.CLAUDE_LOCAL_CONFIG);
    this.ensureDir(claudeDir);

    // Read existing config if it exists
    const existingConfig = this.readJsonFile(claudeConfigFile, {});

    const claudeConfig = {
      ...existingConfig,
      env: {
        ...(existingConfig.env || {}),
        ANTHROPIC_AUTH_TOKEN: account.apiKey,
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`
      }
    };

    // Add custom environment variables if specified
    if (account.customEnv && typeof account.customEnv === 'object') {
      Object.keys(account.customEnv).forEach(key => {
        claudeConfig.env[key] = account.customEnv[key];
      });
    }

    // Preserve existing permissions if any
    if (!claudeConfig.permissions) {
      claudeConfig.permissions = existingConfig.permissions || {
        allow: [],
        deny: [],
        ask: []
      };
    }

    // Write Claude configuration
    this.writeJsonFile(claudeConfigFile, claudeConfig);
  }

  /**
   * Generate both CCR and Claude configurations
   */
  generate(account, options = {}) {
    this.generateCCRConfig(account);
    this.generateClaudeConfigForCCR(account);
  }
}

module.exports = CCRGenerator;
