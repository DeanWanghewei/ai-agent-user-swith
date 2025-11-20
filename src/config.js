const fs = require('fs');
const path = require('path');
const os = require('os');

// Constants for wire API modes
const WIRE_API_MODES = {
  CHAT: 'chat',
  RESPONSES: 'responses',
  ENV: 'env'
};

const DEFAULT_WIRE_API = WIRE_API_MODES.CHAT;

// Constants for account types
const ACCOUNT_TYPES = {
  CLAUDE: 'Claude',
  CODEX: 'Codex',
  CCR: 'CCR',
  DROIDS: 'Droids'
};

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
      this.saveGlobalConfig({ accounts: {}, mcpServers: {}, nextAccountId: 1 });
    }

    // Migrate existing accounts to have IDs
    this.migrateAccountIds();
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
      const config = JSON.parse(data);
      // Ensure nextAccountId exists
      if (!config.nextAccountId) {
        config.nextAccountId = 1;
      }
      return config;
    } catch (error) {
      return { accounts: {}, mcpServers: {}, nextAccountId: 1 };
    }
  }

  /**
   * Save global configuration
   */
  saveGlobalConfig(config) {
    fs.writeFileSync(this.globalConfigFile, JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * Migrate existing accounts to have IDs
   * This ensures backward compatibility by assigning IDs to accounts that don't have one
   */
  migrateAccountIds() {
    const config = this.readGlobalConfig();
    let needsSave = false;

    // Ensure nextAccountId exists
    if (!config.nextAccountId) {
      config.nextAccountId = 1;
      needsSave = true;
    }

    // Assign IDs to accounts that don't have one
    Object.keys(config.accounts || {}).forEach(name => {
      if (!config.accounts[name].id) {
        config.accounts[name].id = config.nextAccountId;
        config.nextAccountId++;
        needsSave = true;
      }
    });

    if (needsSave) {
      this.saveGlobalConfig(config);
    }
  }

  /**
   * Get account by ID or name
   * @param {string|number} idOrName - Account ID or name
   * @returns {Object|null} - Account object with name property, or null if not found
   */
  getAccountByIdOrName(idOrName) {
    const accounts = this.getAllAccounts();

    // Try to parse as ID (number)
    const id = parseInt(idOrName, 10);
    if (!isNaN(id)) {
      // Search by ID
      for (const [name, account] of Object.entries(accounts)) {
        if (account.id === id) {
          return { name, ...account };
        }
      }
    }

    // Search by name
    const account = accounts[idOrName];
    if (account) {
      return { name: idOrName, ...account };
    }

    return null;
  }

  /**
   * Add or update an account
   */
  addAccount(name, accountData) {
    const config = this.readGlobalConfig();

    // Assign ID for new accounts
    const isNewAccount = !config.accounts[name];
    const accountId = isNewAccount ? config.nextAccountId : config.accounts[name].id;

    config.accounts[name] = {
      ...accountData,
      id: accountId,
      createdAt: config.accounts[name]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Increment nextAccountId only for new accounts
    if (isNewAccount) {
      config.nextAccountId++;
    }

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

    // Read existing project config to preserve enabledMcpServers
    let existingConfig = {};
    if (fs.existsSync(projectConfigFile)) {
      try {
        const data = fs.readFileSync(projectConfigFile, 'utf8');
        existingConfig = JSON.parse(data);
      } catch (error) {
        // If parsing fails, start fresh
      }
    }

    const projectConfig = {
      activeAccount: accountName,
      projectPath: projectRoot,
      setAt: new Date().toISOString(),
      enabledMcpServers: existingConfig.enabledMcpServers || []
    };

    fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 2), 'utf8');

    // Generate configuration based on account type
    if (account.type === 'Codex') {
      // Codex type accounts only need Codex configuration
      this.generateCodexConfig(account, projectRoot);
    } else if (account.type === 'Droids') {
      // Droids type accounts only need Droids configuration
      this.generateDroidsConfig(account, projectRoot);
    } else if (account.type === 'CCR') {
      // CCR type accounts need both CCR and Claude configuration
      this.generateCCRConfig(account, projectRoot);
      this.generateClaudeConfigForCCR(account, projectRoot);
    } else {
      // Claude and other types need Claude Code configuration
      this.generateClaudeConfigWithMcp(account, projectRoot);
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
      '.codex-profile',
      '.droids/config.json'
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
   * Generate Droids configuration in .droids/config.json
   */
  generateDroidsConfig(account, projectRoot = process.cwd()) {
    const droidsDir = path.join(projectRoot, '.droids');
    const droidsConfigFile = path.join(droidsDir, 'config.json');

    // Create .droids directory if it doesn't exist
    if (!fs.existsSync(droidsDir)) {
      fs.mkdirSync(droidsDir, { recursive: true });
    }

    // Build Droids configuration
    const droidsConfig = {
      apiKey: account.apiKey
    };

    // Add API URL if specified
    if (account.apiUrl) {
      droidsConfig.baseUrl = account.apiUrl;
    }

    // Add model configuration - Droids uses simple model field
    if (account.model) {
      droidsConfig.model = account.model;
    }

    // Add custom environment variables as customSettings
    if (account.customEnv && typeof account.customEnv === 'object') {
      droidsConfig.customSettings = account.customEnv;
    }

    // Write Droids configuration
    fs.writeFileSync(droidsConfigFile, JSON.stringify(droidsConfig, null, 2), 'utf8');
  }

  /**
   * Generate CCR configuration in ~/.claude-code-router/config.json
   */
  generateCCRConfig(account, projectRoot = process.cwd()) {
    const ccrConfigDir = path.join(os.homedir(), '.claude-code-router');
    const ccrConfigFile = path.join(ccrConfigDir, 'config.json');

    // Read existing config
    let config = {};
    if (fs.existsSync(ccrConfigFile)) {
      const data = fs.readFileSync(ccrConfigFile, 'utf8');
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

    fs.writeFileSync(ccrConfigFile, JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * Generate Claude configuration for CCR type accounts
   */
  generateClaudeConfigForCCR(account, projectRoot = process.cwd()) {
    const claudeDir = path.join(projectRoot, '.claude');
    const claudeConfigFile = path.join(claudeDir, 'settings.local.json');
    const ccrConfigFile = path.join(os.homedir(), '.claude-code-router', 'config.json');

    // Create .claude directory if it doesn't exist
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Read CCR config to get PORT
    let port = 3456; // default port
    if (fs.existsSync(ccrConfigFile)) {
      try {
        const ccrConfig = JSON.parse(fs.readFileSync(ccrConfigFile, 'utf8'));
        if (ccrConfig.PORT) {
          port = ccrConfig.PORT;
        }
      } catch (e) {
        // Use default port if reading fails
      }
    }

    // Read existing config if it exists
    let existingConfig = {};
    if (fs.existsSync(claudeConfigFile)) {
      try {
        const data = fs.readFileSync(claudeConfigFile, 'utf8');
        existingConfig = JSON.parse(data);
      } catch (error) {
        existingConfig = {};
      }
    }

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
    fs.writeFileSync(claudeConfigFile, JSON.stringify(claudeConfig, null, 2), 'utf8');
  }

  /**
   * Generate Codex profile in global ~/.codex/config.toml
   */
  generateCodexConfig(account, projectRoot = process.cwd()) {
    const codexConfigDir = path.join(os.homedir(), '.codex');
    const codexConfigFile = path.join(codexConfigDir, 'config.toml');

    // Create .codex directory if it doesn't exist
    if (!fs.existsSync(codexConfigDir)) {
      fs.mkdirSync(codexConfigDir, { recursive: true });
    }

    // Read existing config if it exists
    let existingConfig = '';
    if (fs.existsSync(codexConfigFile)) {
      existingConfig = fs.readFileSync(codexConfigFile, 'utf8');
    }

    // Generate profile name based on project path
    const projectName = path.basename(projectRoot);
    const profileName = `ais_${projectName}`;

    // Escape special regex characters in names
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedProjectName = escapeRegex(projectName);
    const escapedProfileName = escapeRegex(profileName);

    // Build profile configuration
    let profileConfig = `\n# AIS Profile for project: ${projectRoot}\n`;
    profileConfig += `[profiles.${profileName}]\n`;

    // Determine model provider and model based on account type
    if (account.type === 'Codex') {
      // For Codex type accounts, use custom provider configuration
      const providerName = `ais_${account.name || 'provider'}`;
      const escapedProviderName = escapeRegex(providerName);

      profileConfig += `model_provider = "${providerName}"\n`;

      // Add model configuration - Codex uses simple model field
      if (account.model) {
        profileConfig += `model = "${account.model}"\n`;
      }

      // Smart /v1 path handling
      let baseUrl = account.apiUrl || '';
      if (baseUrl) {
        // Remove trailing slashes
        baseUrl = baseUrl.replace(/\/+$/, '');

        // Check if URL already has a path beyond the domain
        // Pattern: protocol://domain or protocol://domain:port (no path)
        const isDomainOnly = baseUrl.match(/^https?:\/\/[^\/]+$/);

        // Only add /v1 if:
        // 1. URL is domain-only (no path), OR
        // 2. URL explicitly ends with /v1 already (ensure consistency)
        if (isDomainOnly) {
          baseUrl += '/v1';
        }
        // If URL has a path (e.g., /v2, /custom, /api), keep it as is
      }

      // Remove existing provider if it exists (simpler than updating)
      const providerPattern = new RegExp(`\\[model_providers\\.${escapedProviderName}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
      existingConfig = existingConfig.replace(providerPattern, '');

      // Add new provider details
      profileConfig += `\n[model_providers.${providerName}]\n`;
      profileConfig += `name = "${providerName}"\n`;

      if (baseUrl) {
        profileConfig += `base_url = "${baseUrl}"\n`;
      }

      // Determine wire_api based on account configuration (default to chat for backward compatibility)
      const wireApi = account.wireApi || DEFAULT_WIRE_API;

      if (wireApi === WIRE_API_MODES.CHAT) {
        // Chat mode: use HTTP headers for authentication
        profileConfig += `wire_api = "${WIRE_API_MODES.CHAT}"\n`;
        profileConfig += `http_headers = { "Authorization" = "Bearer ${account.apiKey}" }\n`;

        // Note: We do NOT clear auth.json here because:
        // 1. auth.json is a global file shared by all projects
        // 2. Other projects may be using responses mode and need the API key
        // 3. Chat mode doesn't use auth.json anyway, so no conflict exists
      } else if (wireApi === WIRE_API_MODES.RESPONSES) {
        // Responses mode: use auth.json for authentication
        profileConfig += `wire_api = "${WIRE_API_MODES.RESPONSES}"\n`;
        profileConfig += `requires_openai_auth = true\n`;

        // Update auth.json with API key
        this.updateCodexAuthJson(account.apiKey);
      } else if (wireApi === WIRE_API_MODES.ENV) {
        // Env mode: use environment variable for authentication
        profileConfig += `wire_api = "${WIRE_API_MODES.CHAT}"\n`;
        const envKey = account.envKey || 'AIS_USER_API_KEY';
        profileConfig += `env_key = "${envKey}"\n`;

        // Clear auth.json to ensure env mode is used
        this.clearCodexAuthJson();
      }
    }

    // Remove all old profiles with the same name (including duplicates)
    // Use line-by-line parsing for more reliable cleanup
    existingConfig = this._removeProfileFromConfig(existingConfig, profileName);

    // Append new profile
    const newConfig = existingConfig.trimEnd() + '\n' + profileConfig;

    // Write Codex configuration
    fs.writeFileSync(codexConfigFile, newConfig, 'utf8');

    // Create a helper script in project directory
    const helperScript = path.join(projectRoot, '.codex-profile');
    fs.writeFileSync(helperScript, profileName, 'utf8');
  }

  /**
   * Read auth.json file
   * @private
   * @returns {Object} Parsed auth data or empty object
   */
  _readAuthJson(authJsonFile) {
    if (!fs.existsSync(authJsonFile)) {
      return {};
    }

    try {
      const content = fs.readFileSync(authJsonFile, 'utf8');
      return JSON.parse(content);
    } catch (parseError) {
      const chalk = require('chalk');
      console.warn(
        chalk.yellow(
          `⚠ Warning: Could not parse existing auth.json, will create new file (警告: 无法解析现有 auth.json，将创建新文件)`
        )
      );
      return {};
    }
  }

  /**
   * Write auth.json file atomically with proper permissions
   * Uses atomic write (temp file + rename) to prevent corruption from concurrent access
   * @private
   * @param {string} authJsonFile - Path to auth.json
   * @param {Object} authData - Auth data to write
   */
  _writeAuthJson(authJsonFile, authData) {
    const chalk = require('chalk');
    const tempFile = `${authJsonFile}.tmp.${process.pid}`;

    try {
      // Write to temporary file first (atomic operation)
      fs.writeFileSync(tempFile, JSON.stringify(authData, null, 2), 'utf8');

      // Set file permissions to 600 (owner read/write only) for security
      if (process.platform !== 'win32') {
        fs.chmodSync(tempFile, 0o600);
      }

      // Atomically rename temp file to actual file
      // This is atomic on POSIX systems and prevents corruption
      fs.renameSync(tempFile, authJsonFile);
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Remove a profile from TOML config string
   * Uses line-by-line parsing for reliable removal of all instances
   * @private
   * @param {string} configContent - The TOML config content
   * @param {string} profileName - The profile name to remove (e.g., "ais_myproject")
   * @returns {string} Cleaned config content
   */
  _removeProfileFromConfig(configContent, profileName) {
    const lines = configContent.split('\n');
    const cleanedLines = [];
    let skipUntilNextSection = false;
    const profileSectionHeader = `[profiles.${profileName}]`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if this is the profile section we want to remove
      if (trimmedLine === profileSectionHeader) {
        skipUntilNextSection = true;

        // Remove the AIS comment line before it if present
        if (cleanedLines.length > 0) {
          const lastLine = cleanedLines[cleanedLines.length - 1].trim();
          if (lastLine.startsWith('# AIS Profile for project:')) {
            cleanedLines.pop();
          }
        }

        // Remove trailing empty lines before the profile
        while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') {
          cleanedLines.pop();
        }

        continue; // Skip the profile header line
      }

      // If we're in skip mode, check if we've reached the next section
      if (skipUntilNextSection) {
        // A new section starts with '[' at the beginning (after trimming)
        if (trimmedLine.startsWith('[')) {
          skipUntilNextSection = false;
          // Don't skip this line - it's the start of a new section
        } else {
          // Skip this line as it belongs to the profile we're removing
          continue;
        }
      }

      cleanedLines.push(line);
    }

    // Join lines and clean up excessive empty lines
    let result = cleanedLines.join('\n');

    // Replace 3+ consecutive newlines with just 2 (one blank line)
    result = result.replace(/\n{3,}/g, '\n\n');

    return result;
  }

  /**
   * Clear OPENAI_API_KEY in ~/.codex/auth.json for chat mode
   * @deprecated This method is no longer called automatically.
   * Chat mode doesn't require clearing auth.json since it doesn't use it.
   */
  clearCodexAuthJson() {
    const chalk = require('chalk');
    const codexDir = path.join(os.homedir(), '.codex');
    const authJsonFile = path.join(codexDir, 'auth.json');

    try {
      // Ensure .codex directory exists
      if (!fs.existsSync(codexDir)) {
        fs.mkdirSync(codexDir, { recursive: true });
      }

      // Read existing auth data
      const authData = this._readAuthJson(authJsonFile);

      // Clear OPENAI_API_KEY (set to empty string)
      authData.OPENAI_API_KEY = "";

      // Write atomically with proper permissions
      this._writeAuthJson(authJsonFile, authData);

      console.log(
        chalk.cyan(
          `✓ Cleared OPENAI_API_KEY in auth.json (chat mode) (已清空 auth.json 中的 OPENAI_API_KEY)`
        )
      );
    } catch (error) {
      console.error(
        chalk.yellow(
          `⚠ Warning: Failed to clear auth.json: ${error.message} (警告: 清空 auth.json 失败)`
        )
      );
      // Don't throw error, just warn - this is not critical for chat mode
    }
  }

  /**
   * Update ~/.codex/auth.json with API key for responses mode
   * @param {string} apiKey - API key to store in auth.json
   * @throws {Error} If file operations fail
   */
  updateCodexAuthJson(apiKey) {
    const chalk = require('chalk');
    const codexDir = path.join(os.homedir(), '.codex');
    const authJsonFile = path.join(codexDir, 'auth.json');

    try {
      // Ensure .codex directory exists
      if (!fs.existsSync(codexDir)) {
        fs.mkdirSync(codexDir, { recursive: true });
      }

      // Read existing auth data
      const authData = this._readAuthJson(authJsonFile);

      // Update OPENAI_API_KEY
      authData.OPENAI_API_KEY = apiKey;

      // Write atomically with proper permissions
      this._writeAuthJson(authJsonFile, authData);

      console.log(
        chalk.green(
          `✓ Updated auth.json at: ${authJsonFile} (已更新 auth.json)`
        )
      );
    } catch (error) {
      console.error(
        chalk.red(
          `✗ Failed to update auth.json: ${error.message} (更新 auth.json 失败)`
        )
      );
      throw error;
    }
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

  /**
   * Add or update an MCP server
   */
  addMcpServer(name, serverData) {
    const config = this.readGlobalConfig();
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers[name] = {
      ...serverData,
      createdAt: config.mcpServers[name]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveGlobalConfig(config);
    return true;
  }

  /**
   * Get all MCP servers
   */
  getAllMcpServers() {
    const config = this.readGlobalConfig();
    return config.mcpServers || {};
  }

  /**
   * Get a specific MCP server
   */
  getMcpServer(name) {
    const servers = this.getAllMcpServers();
    return servers[name] || null;
  }

  /**
   * Update an MCP server
   */
  updateMcpServer(name, serverData) {
    const config = this.readGlobalConfig();
    if (!config.mcpServers || !config.mcpServers[name]) return false;
    config.mcpServers[name] = {
      ...serverData,
      createdAt: config.mcpServers[name].createdAt,
      updatedAt: new Date().toISOString()
    };
    this.saveGlobalConfig(config);
    return true;
  }

  /**
   * Check if MCP server is enabled in current project
   */
  isMcpServerEnabledInCurrentProject(serverName) {
    try {
      const projectRoot = this.findProjectRoot();
      if (!projectRoot) return false;

      const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);
      if (!fs.existsSync(projectConfigFile)) return false;

      const data = fs.readFileSync(projectConfigFile, 'utf8');
      const projectConfig = JSON.parse(data);

      return projectConfig.enabledMcpServers &&
             projectConfig.enabledMcpServers.includes(serverName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove MCP server from current project's enabled list
   */
  removeMcpServerFromCurrentProject(serverName) {
    try {
      const projectRoot = this.findProjectRoot();
      if (!projectRoot) return false;

      const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);
      if (!fs.existsSync(projectConfigFile)) return false;

      const data = fs.readFileSync(projectConfigFile, 'utf8');
      const projectConfig = JSON.parse(data);

      if (!projectConfig.enabledMcpServers) return false;

      const index = projectConfig.enabledMcpServers.indexOf(serverName);
      if (index > -1) {
        projectConfig.enabledMcpServers.splice(index, 1);
        fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 2), 'utf8');
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove an MCP server
   */
  removeMcpServer(name) {
    const config = this.readGlobalConfig();
    if (config.mcpServers && config.mcpServers[name]) {
      delete config.mcpServers[name];
      this.saveGlobalConfig(config);
      return true;
    }
    return false;
  }

  /**
   * Get project MCP configuration
   */
  getProjectMcpServers() {
    try {
      const projectRoot = this.findProjectRoot();
      if (!projectRoot) return [];
      const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);
      if (!fs.existsSync(projectConfigFile)) return [];
      const data = fs.readFileSync(projectConfigFile, 'utf8');
      const projectConfig = JSON.parse(data);
      return projectConfig.enabledMcpServers || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Enable MCP server for current project
   */
  enableProjectMcpServer(serverName) {
    const server = this.getMcpServer(serverName);
    if (!server) return false;

    const projectRoot = this.findProjectRoot();
    if (!projectRoot) {
      throw new Error('Not in a configured project directory. Run "ais use" first.');
    }

    const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);
    if (!fs.existsSync(projectConfigFile)) {
      throw new Error('Project not configured. Run "ais use" first.');
    }

    try {
      const data = fs.readFileSync(projectConfigFile, 'utf8');
      const projectConfig = JSON.parse(data);

      if (!projectConfig.enabledMcpServers) projectConfig.enabledMcpServers = [];
      if (!projectConfig.enabledMcpServers.includes(serverName)) {
        projectConfig.enabledMcpServers.push(serverName);
        fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 2), 'utf8');
      }
      return true;
    } catch (error) {
      throw new Error(`Failed to enable MCP server: ${error.message}`);
    }
  }

  /**
   * Disable MCP server for current project
   */
  disableProjectMcpServer(serverName) {
    const projectRoot = this.findProjectRoot();
    if (!projectRoot) {
      throw new Error('Not in a configured project directory.');
    }

    const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);
    if (!fs.existsSync(projectConfigFile)) {
      throw new Error('Project not configured. Run "ais use" first.');
    }

    try {
      const data = fs.readFileSync(projectConfigFile, 'utf8');
      const projectConfig = JSON.parse(data);

      if (!projectConfig.enabledMcpServers) return false;

      const index = projectConfig.enabledMcpServers.indexOf(serverName);
      if (index > -1) {
        projectConfig.enabledMcpServers.splice(index, 1);
        fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 2), 'utf8');
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to disable MCP server: ${error.message}`);
    }
  }

  /**
   * Get enabled MCP servers for current project
   */
  getEnabledMcpServers() {
    return this.getProjectMcpServers();
  }

  /**
   * Get Claude Code user config path (cross-platform)
   */
  getClaudeUserConfigPath() {
    const platform = process.platform;
    const home = process.env.HOME || process.env.USERPROFILE;

    if (!home) return null;

    // Try common locations
    const locations = [
      path.join(home, '.claude.json'),
      path.join(home, '.config', 'claude', 'config.json')
    ];

    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        return loc;
      }
    }

    return null;
  }

  /**
   * Import MCP servers from Claude user config (~/.claude.json)
   */
  importMcpServersFromClaudeConfig(projectRoot) {
    const claudeConfigPath = this.getClaudeUserConfigPath();
    if (!claudeConfigPath) {
      return { imported: [], fromUserConfig: [], fromProjectConfig: [] };
    }

    try {
      const data = fs.readFileSync(claudeConfigPath, 'utf8');
      const claudeConfig = JSON.parse(data);

      const imported = [];
      const fromUserConfig = [];
      const fromProjectConfig = [];
      const allServers = this.getAllMcpServers();

      // Import from user-level MCP servers
      if (claudeConfig.mcpServers && typeof claudeConfig.mcpServers === 'object') {
        Object.entries(claudeConfig.mcpServers).forEach(([name, serverConfig]) => {
          if (!allServers[name]) {
            const aisServerData = {
              name: name,
              ...serverConfig,
              description: serverConfig.description || 'Imported from Claude user config'
            };

            // Ensure type is set
            if (!aisServerData.type) {
              if (aisServerData.command) {
                aisServerData.type = 'stdio';
              } else if (aisServerData.url) {
                aisServerData.type = 'http';
              }
            }

            this.addMcpServer(name, aisServerData);
            imported.push(name);
            fromUserConfig.push(name);
          }
        });
      }

      // Import from project-specific MCP servers in Claude config
      if (claudeConfig.projects && projectRoot) {
        const projectConfig = claudeConfig.projects[projectRoot];
        if (projectConfig && projectConfig.mcpServers && typeof projectConfig.mcpServers === 'object') {
          Object.entries(projectConfig.mcpServers).forEach(([name, serverConfig]) => {
            if (!allServers[name]) {
              const aisServerData = {
                name: name,
                ...serverConfig,
                description: serverConfig.description || 'Imported from Claude project config'
              };

              // Ensure type is set
              if (!aisServerData.type) {
                if (aisServerData.command) {
                  aisServerData.type = 'stdio';
                } else if (aisServerData.url) {
                  aisServerData.type = 'http';
                }
              }

              this.addMcpServer(name, aisServerData);
              imported.push(name);
              fromProjectConfig.push(name);
            }
          });
        }
      }

      return { imported, fromUserConfig, fromProjectConfig };
    } catch (error) {
      console.warn(`Warning: Could not import from Claude config: ${error.message}`);
      return { imported: [], fromUserConfig: [], fromProjectConfig: [] };
    }
  }

  /**
   * Import MCP servers from .mcp.json to AIS global config
   * Returns array of imported server names
   */
  importMcpServersFromFile(projectRoot) {
    const mcpJsonFile = path.join(projectRoot, '.mcp.json');
    if (!fs.existsSync(mcpJsonFile)) {
      return { imported: [], enabled: [] };
    }

    try {
      const data = fs.readFileSync(mcpJsonFile, 'utf8');
      const mcpJson = JSON.parse(data);

      if (!mcpJson.mcpServers || typeof mcpJson.mcpServers !== 'object') {
        return { imported: [], enabled: [] };
      }

      const imported = [];
      const enabled = [];
      const allServers = this.getAllMcpServers();

      Object.entries(mcpJson.mcpServers).forEach(([name, serverConfig]) => {
        // Check if server already exists in AIS config
        if (!allServers[name]) {
          // Import server to AIS config
          const aisServerData = {
            name: name,
            ...serverConfig,
            description: serverConfig.description || 'Imported from .mcp.json'
          };

          // Ensure type is set
          if (!aisServerData.type) {
            if (aisServerData.command) {
              aisServerData.type = 'stdio';
            } else if (aisServerData.url) {
              aisServerData.type = 'http';
            }
          }

          this.addMcpServer(name, aisServerData);
          imported.push(name);
        }
        enabled.push(name);
      });

      // Update project's enabled servers list
      if (enabled.length > 0) {
        const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);
        const projectData = fs.readFileSync(projectConfigFile, 'utf8');
        const projectConfig = JSON.parse(projectData);

        // Merge with existing enabled servers (deduplicate)
        const currentEnabled = projectConfig.enabledMcpServers || [];
        const mergedEnabled = [...new Set([...currentEnabled, ...enabled])];

        if (JSON.stringify(currentEnabled.sort()) !== JSON.stringify(mergedEnabled.sort())) {
          projectConfig.enabledMcpServers = mergedEnabled;
          fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 2), 'utf8');
        }
      }

      return { imported, enabled };
    } catch (error) {
      console.warn(`Warning: Could not import from .mcp.json: ${error.message}`);
      return { imported: [], enabled: [] };
    }
  }

  /**
   * Sync MCP configuration (bidirectional)
   * - Import servers from Claude user config (~/.claude.json) to AIS config
   * - Import servers from .mcp.json to AIS config
   * - Export enabled servers from AIS config to .mcp.json
   */
  syncMcpConfig() {
    const projectRoot = this.findProjectRoot();
    if (!projectRoot) {
      throw new Error('Not in a project directory');
    }

    const projectConfigFile = path.join(projectRoot, this.projectConfigFilename);
    if (!fs.existsSync(projectConfigFile)) {
      throw new Error('Project not configured. Run "ais use" first');
    }

    try {
      // Step 1: Import servers from Claude user config
      const claudeImport = this.importMcpServersFromClaudeConfig(projectRoot);

      // Step 2: Import servers from .mcp.json to AIS config
      const fileImport = this.importMcpServersFromFile(projectRoot);

      // Step 3: Get account and generate .mcp.json
      const projectData = fs.readFileSync(projectConfigFile, 'utf8');
      const projectConfig = JSON.parse(projectData);
      const account = this.getAccount(projectConfig.activeAccount);

      if (!account) {
        throw new Error('Account not found');
      }

      this.generateClaudeConfigWithMcp(account, projectRoot);

      // Combine results
      const allImported = [
        ...claudeImport.imported,
        ...fileImport.imported
      ];

      return {
        imported: allImported,
        fromClaudeUserConfig: claudeImport.fromUserConfig,
        fromClaudeProjectConfig: claudeImport.fromProjectConfig,
        fromMcpJson: fileImport.imported,
        enabled: fileImport.enabled
      };
    } catch (error) {
      throw new Error(`Failed to sync MCP configuration: ${error.message}`);
    }
  }

  /**
   * Generate Claude Code configuration with MCP servers
   */
  generateClaudeConfigWithMcp(account, projectRoot = process.cwd()) {
    try {
      // First generate base Claude configuration
      this.generateClaudeConfig(account, projectRoot);

      // Then generate .mcp.json for MCP servers configuration
      const mcpConfigFile = path.join(projectRoot, '.mcp.json');

      // Get enabled MCP servers
      const enabledServers = this.getEnabledMcpServers();
      const allServers = this.getAllMcpServers();

      if (enabledServers.length > 0) {
        const mcpConfig = {
          mcpServers: {}
        };

        enabledServers.forEach(serverName => {
          const server = allServers[serverName];
          if (server) {
            const serverConfig = {};

            // For stdio type MCP servers
            if (server.type === 'stdio' && server.command) {
              serverConfig.command = server.command;
              if (server.args) serverConfig.args = server.args;
              if (server.env) serverConfig.env = server.env;
            }
            // For http/sse type MCP servers
            else if ((server.type === 'http' || server.type === 'sse') && server.url) {
              serverConfig.type = server.type;
              serverConfig.url = server.url;
              if (server.headers) serverConfig.headers = server.headers;
            }
            // Legacy support: infer type from fields
            else if (server.command) {
              serverConfig.command = server.command;
              if (server.args) serverConfig.args = server.args;
              if (server.env) serverConfig.env = server.env;
            } else if (server.url) {
              // Default to http if type not specified
              serverConfig.type = server.type || 'http';
              serverConfig.url = server.url;
              if (server.headers) serverConfig.headers = server.headers;
            }

            mcpConfig.mcpServers[serverName] = serverConfig;
          }
        });

        fs.writeFileSync(mcpConfigFile, JSON.stringify(mcpConfig, null, 2), 'utf8');
      } else {
        // Remove .mcp.json if no servers are enabled
        if (fs.existsSync(mcpConfigFile)) {
          fs.unlinkSync(mcpConfigFile);
        }
      }
    } catch (error) {
      throw new Error(`Failed to generate Claude config with MCP: ${error.message}`);
    }
  }
}

module.exports = ConfigManager;
module.exports.WIRE_API_MODES = WIRE_API_MODES;
module.exports.DEFAULT_WIRE_API = DEFAULT_WIRE_API;
module.exports.ACCOUNT_TYPES = ACCOUNT_TYPES;
