const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Cross-platform configuration manager
 * Stores global accounts in user home directory
 * Stores project-specific configuration in project directory
 */
class ConfigManager {
  constructor() {
    // Global config path (stores all accounts)
    this.globalConfigDir = path.join(os.homedir(), '.ai-account-switch');
    this.globalConfigFile = path.join(this.globalConfigDir, 'config.json');

    // Project config filename
    this.projectConfigFilename = '.ais-project-config';

    this.ensureConfigExists();
  }

  /**
   * Ensure configuration directories and files exist
   */
  ensureConfigExists() {
    // Create global config directory
    if (!fs.existsSync(this.globalConfigDir)) {
      fs.mkdirSync(this.globalConfigDir, { recursive: true });
    }

    // Create global config file if it doesn't exist
    if (!fs.existsSync(this.globalConfigFile)) {
      this.saveGlobalConfig({ accounts: {} });
    }
  }

  /**
   * Find project root by searching upwards for .ais-project-config file
   * Similar to how git finds .git directory
   */
  findProjectRoot(startDir = process.cwd()) {
    let currentDir = path.resolve(startDir);
    const rootDir = path.parse(currentDir).root;

    while (currentDir !== rootDir) {
      const configPath = path.join(currentDir, this.projectConfigFilename);
      if (fs.existsSync(configPath)) {
        return currentDir;
      }
      // Move up one directory
      currentDir = path.dirname(currentDir);
    }

    // Check root directory as well
    const configPath = path.join(rootDir, this.projectConfigFilename);
    if (fs.existsSync(configPath)) {
      return rootDir;
    }

    return null;
  }

  /**
   * Read global configuration
   */
  readGlobalConfig() {
    try {
      const data = fs.readFileSync(this.globalConfigFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { accounts: {} };
    }
  }

  /**
   * Save global configuration
   */
  saveGlobalConfig(config) {
    fs.writeFileSync(this.globalConfigFile, JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * Add or update an account
   */
  addAccount(name, accountData) {
    const config = this.readGlobalConfig();
    config.accounts[name] = {
      ...accountData,
      createdAt: config.accounts[name]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveGlobalConfig(config);
    return true;
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    const config = this.readGlobalConfig();
    return config.accounts || {};
  }

  /**
   * Get a specific account
   */
  getAccount(name) {
    const accounts = this.getAllAccounts();
    return accounts[name] || null;
  }

  /**
   * Remove an account
   */
  removeAccount(name) {
    const config = this.readGlobalConfig();
    if (config.accounts[name]) {
      delete config.accounts[name];
      this.saveGlobalConfig(config);
      return true;
    }
    return false;
  }

  /**
   * Set current project's active account
   */
  setProjectAccount(accountName) {
    const account = this.getAccount(accountName);
    if (!account) {
      return false;
    }

    const projectRoot = process.cwd();
    const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);

    const projectConfig = {
      activeAccount: accountName,
      projectPath: projectRoot,
      setAt: new Date().toISOString()
    };

    fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 2), 'utf8');

    // Generate configuration based on account type
    if (account.type === 'Codex') {
      // Codex type accounts only need Codex configuration
      this.generateCodexConfig(account, projectRoot);
    } else {
      // Claude and other types need Claude Code configuration
      this.generateClaudeConfig(account, projectRoot);
    }

    // Add to .gitignore if git is initialized
    this.addToGitignore(projectRoot);

    return true;
  }

  /**
   * Add AIS config files to .gitignore if git repository exists
   */
  addToGitignore(projectRoot = process.cwd()) {
    const gitDir = path.join(projectRoot, '.git');
    const gitignorePath = path.join(projectRoot, '.gitignore');

    // Check if this is a git repository
    if (!fs.existsSync(gitDir)) {
      return false;
    }

    // Files to add to .gitignore
    const filesToIgnore = [
      this.projectConfigFilename,
      '.claude/settings.local.json',
      '.codex/config.toml'
    ];

    let gitignoreContent = '';
    let needsUpdate = false;

    // Read existing .gitignore if it exists
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    // Split into lines for easier processing
    const lines = gitignoreContent.split('\n');
    const existingEntries = new Set(lines.map(line => line.trim()));

    // Check which files need to be added
    const entriesToAdd = [];
    for (const file of filesToIgnore) {
      if (!existingEntries.has(file)) {
        entriesToAdd.push(file);
        needsUpdate = true;
      }
    }

    if (!needsUpdate) {
      return false;
    }

    // Add AIS section header if adding new entries
    let newContent = gitignoreContent;

    // Ensure file ends with newline if it has content
    if (newContent.length > 0 && !newContent.endsWith('\n')) {
      newContent += '\n';
    }

    // Add section header and entries
    if (entriesToAdd.length > 0) {
      // Add blank line before section if file has content
      if (newContent.length > 0) {
        newContent += '\n';
      }

      newContent += '# AIS (AI Account Switch) - Local configuration files\n';
      entriesToAdd.forEach(entry => {
        newContent += entry + '\n';
      });
    }

    // Write updated .gitignore
    fs.writeFileSync(gitignorePath, newContent, 'utf8');
    return true;
  }

  /**
   * Generate Claude Code .claude/settings.local.json configuration
   */
  generateClaudeConfig(account, projectRoot = process.cwd()) {
    const claudeDir = path.join(projectRoot, '.claude');
    const claudeConfigFile = path.join(claudeDir, 'settings.local.json');

    // Create .claude directory if it doesn't exist
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Read existing config if it exists
    let existingConfig = {};
    if (fs.existsSync(claudeConfigFile)) {
      try {
        const data = fs.readFileSync(claudeConfigFile, 'utf8');
        existingConfig = JSON.parse(data);
      } catch (error) {
        // If parsing fails, start fresh
        existingConfig = {};
      }
    }

    // List of model-related environment variable keys that should be cleared
    const modelKeys = [
      'DEFAULT_MODEL',
      'ANTHROPIC_DEFAULT_OPUS_MODEL',
      'ANTHROPIC_DEFAULT_SONNET_MODEL',
      'ANTHROPIC_DEFAULT_HAIKU_MODEL',
      'CLAUDE_CODE_SUBAGENT_MODEL',
      'ANTHROPIC_MODEL'
    ];

    // Build Claude configuration - preserve existing env but clear model configs
    const existingEnv = existingConfig.env || {};
    const cleanedEnv = {};

    // Copy all existing env vars except model-related ones
    Object.keys(existingEnv).forEach(key => {
      if (!modelKeys.includes(key)) {
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
    if (account.modelGroups && account.activeModelGroup) {
      const activeGroup = account.modelGroups[account.activeModelGroup];

      if (activeGroup && typeof activeGroup === 'object') {
        const defaultModel = activeGroup.DEFAULT_MODEL;

        // Set DEFAULT_MODEL if specified
        if (defaultModel) {
          claudeConfig.env.DEFAULT_MODEL = defaultModel;
        }

        // Set other model configs, using DEFAULT_MODEL as fallback if they're not specified
        modelKeys.slice(1).forEach(key => { // Skip DEFAULT_MODEL as it's already set
          if (activeGroup[key]) {
            // If the specific model is configured, use it
            claudeConfig.env[key] = activeGroup[key];
          } else if (defaultModel) {
            // If not configured but DEFAULT_MODEL exists, use DEFAULT_MODEL as fallback
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

      modelKeys.slice(1).forEach(key => {
        if (account.modelConfig[key]) {
          claudeConfig.env[key] = account.modelConfig[key];
        } else if (defaultModel) {
          claudeConfig.env[key] = defaultModel;
        }
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
    fs.writeFileSync(claudeConfigFile, JSON.stringify(claudeConfig, null, 2), 'utf8');
  }

  /**
   * Generate Codex .codex/config.toml configuration
   */
  generateCodexConfig(account, projectRoot = process.cwd()) {
    const codexDir = path.join(projectRoot, '.codex');
    const codexConfigFile = path.join(codexDir, 'config.toml');

    // Create .codex directory if it doesn't exist
    if (!fs.existsSync(codexDir)) {
      fs.mkdirSync(codexDir, { recursive: true });
    }

    // Build TOML configuration content
    let tomlContent = '# Codex Configuration - Generated by AIS (AI Account Switch)\n';
    tomlContent += '# This file is auto-generated. Do not edit manually.\n\n';

    // Determine model provider and model based on account type
    if (account.type === 'Codex') {
      // For Codex type accounts, use custom provider configuration
      const providerName = 'ais_provider';

      // Add model provider configuration
      tomlContent += `model_provider = "${providerName}"\n`;

      // Add model configuration from active model group if available
      if (account.modelGroups && account.activeModelGroup) {
        const activeGroup = account.modelGroups[account.activeModelGroup];
        if (activeGroup && activeGroup.DEFAULT_MODEL) {
          tomlContent += `model = "${activeGroup.DEFAULT_MODEL}"\n`;
        }
      }

      tomlContent += '\n';

      // Add provider details
      tomlContent += `[model_providers.${providerName}]\n`;
      tomlContent += `name = "${providerName}"\n`;

      if (account.apiUrl) {
        tomlContent += `base_url = "${account.apiUrl}"\n`;
      }

      // Determine wire_api based on API URL or default to "chat"
      const wireApi = account.apiUrl && account.apiUrl.includes('openai') ? 'chat' : 'responses';
      tomlContent += `wire_api = "${wireApi}"\n`;

      // Add authentication header
      tomlContent += `http_headers = { "Authorization" = "Bearer ${account.apiKey}" }\n`;

    } else if (account.type === 'Claude') {
      // For Claude type accounts, use Anthropic-compatible configuration
      const providerName = 'anthropic';

      tomlContent += `model_provider = "${providerName}"\n`;

      // Add model configuration from active model group if available
      if (account.modelGroups && account.activeModelGroup) {
        const activeGroup = account.modelGroups[account.activeModelGroup];
        if (activeGroup && activeGroup.DEFAULT_MODEL) {
          tomlContent += `model = "${activeGroup.DEFAULT_MODEL}"\n`;
        } else {
          tomlContent += `model = "claude-3-5-sonnet-20241022"\n`;
        }
      } else {
        tomlContent += `model = "claude-3-5-sonnet-20241022"\n`;
      }

      tomlContent += '\n';

      // Add provider details
      tomlContent += `[model_providers.${providerName}]\n`;
      tomlContent += `name = "Anthropic"\n`;

      const baseUrl = account.apiUrl || 'https://api.anthropic.com';
      tomlContent += `base_url = "${baseUrl}"\n`;
      tomlContent += `wire_api = "responses"\n`;

      // Add authentication header
      tomlContent += `http_headers = { "x-api-key" = "${account.apiKey}", "anthropic-version" = "2023-06-01" }\n`;
    }

    tomlContent += '\n';

    // Add custom environment variables as comments (for reference)
    if (account.customEnv && typeof account.customEnv === 'object' && Object.keys(account.customEnv).length > 0) {
      tomlContent += '# Custom environment variables (set these in your shell if needed):\n';
      Object.entries(account.customEnv).forEach(([key, value]) => {
        tomlContent += `# ${key}=${value}\n`;
      });
      tomlContent += '\n';
    }

    // Write Codex configuration
    fs.writeFileSync(codexConfigFile, tomlContent, 'utf8');
  }

  /**
   * Get current project's active account
   * Searches upwards from current directory to find project root
   */
  getProjectAccount() {
    try {
      const projectRoot = this.findProjectRoot();
      if (!projectRoot) {
        return null;
      }

      const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);
      const data = fs.readFileSync(projectConfigFile, 'utf8');
      const projectConfig = JSON.parse(data);

      // Get the full account details
      const account = this.getAccount(projectConfig.activeAccount);
      if (account) {
        return {
          name: projectConfig.activeAccount,
          ...account,
          setAt: projectConfig.setAt,
          projectRoot: projectRoot
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if an account exists
   */
  accountExists(name) {
    const accounts = this.getAllAccounts();
    return !!accounts[name];
  }

  /**
   * Get configuration file paths (for display purposes)
   */
  getConfigPaths() {
    return {
      global: this.globalConfigFile,
      project: this.projectConfigFile,
      globalDir: this.globalConfigDir
    };
  }
}

module.exports = ConfigManager;
