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

    // Generate Claude Code project-level configuration
    this.generateClaudeConfig(account, projectRoot);

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
      '.claude/settings.local.json'
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

    // Build Claude configuration
    const claudeConfig = {
      ...existingConfig,
      env: {
        ...(existingConfig.env || {}),
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
