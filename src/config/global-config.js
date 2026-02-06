/**
 * Global Configuration Manager
 * Handles global configuration operations (accounts, MCP servers in home directory)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { CONFIG_FILES } = require('../constants');

class GlobalConfigManager {
  constructor() {
    this.globalConfigDir = path.join(os.homedir(), CONFIG_FILES.GLOBAL_DIR);
    this.globalConfigFile = path.join(this.globalConfigDir, CONFIG_FILES.GLOBAL_CONFIG);
    this.projectConfigFilename = '.ais-project-config';
    this.ensureConfigExists();
  }

  /**
   * Ensure configuration directories and files exist
   */
  ensureConfigExists() {
    if (!fs.existsSync(this.globalConfigDir)) {
      fs.mkdirSync(this.globalConfigDir, { recursive: true });
    }

    if (!fs.existsSync(this.globalConfigFile)) {
      this.save({ accounts: {}, mcpServers: {}, nextAccountId: 1 });
    }

    this.migrateAccountIds();
  }

  /**
   * Find project root by searching upwards for .ais-project-config file
   */
  findProjectRoot(startDir = process.cwd()) {
    let currentDir = path.resolve(startDir);
    const rootDir = path.parse(currentDir).root;

    while (currentDir !== rootDir) {
      const configPath = path.join(currentDir, this.projectConfigFilename);
      if (fs.existsSync(configPath)) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    const configPath = path.join(rootDir, this.projectConfigFilename);
    if (fs.existsSync(configPath)) {
      return rootDir;
    }

    return null;
  }

  /**
   * Read global configuration
   */
  read() {
    try {
      const data = fs.readFileSync(this.globalConfigFile, 'utf8');
      const config = JSON.parse(data);
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
  save(config) {
    fs.writeFileSync(this.globalConfigFile, JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * Migrate existing accounts to have IDs
   */
  migrateAccountIds() {
    const config = this.read();
    let needsSave = false;

    if (!config.nextAccountId) {
      config.nextAccountId = 1;
      needsSave = true;
    }

    Object.keys(config.accounts || {}).forEach(name => {
      if (!config.accounts[name].id) {
        config.accounts[name].id = config.nextAccountId;
        config.nextAccountId++;
        needsSave = true;
      }
    });

    if (needsSave) {
      this.save(config);
    }
  }

  /**
   * Get account by ID or name
   */
  getAccountByIdOrName(idOrName) {
    const accounts = this.getAllAccounts();

    const id = parseInt(idOrName, 10);
    if (!isNaN(id)) {
      for (const [name, account] of Object.entries(accounts)) {
        if (account.id === id) {
          return { name, ...account };
        }
      }
    }

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
    const config = this.read();

    const isNewAccount = !config.accounts[name];
    const accountId = isNewAccount ? config.nextAccountId : config.accounts[name].id;

    config.accounts[name] = {
      ...accountData,
      id: accountId,
      createdAt: config.accounts[name]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isNewAccount) {
      config.nextAccountId++;
    }

    this.save(config);
    return true;
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    const config = this.read();
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
    const config = this.read();
    if (config.accounts[name]) {
      delete config.accounts[name];
      this.save(config);
      return true;
    }
    return false;
  }

  /**
   * Check if an account exists
   */
  accountExists(name) {
    const accounts = this.getAllAccounts();
    return !!accounts[name];
  }

  // MCP Server methods

  /**
   * Add or update an MCP server
   */
  addMcpServer(name, serverData) {
    const config = this.read();
    if (!config.mcpServers) config.mcpServers = {};

    const { DEFAULT_MCP_SCOPE } = require('../constants');
    if (!serverData.scope) {
      serverData.scope = DEFAULT_MCP_SCOPE;
    }

    config.mcpServers[name] = {
      ...serverData,
      createdAt: config.mcpServers[name]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.save(config);
    return true;
  }

  /**
   * Get all MCP servers
   */
  getAllMcpServers() {
    const config = this.read();
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
    const config = this.read();
    if (!config.mcpServers || !config.mcpServers[name]) return false;
    config.mcpServers[name] = {
      ...serverData,
      createdAt: config.mcpServers[name].createdAt,
      updatedAt: new Date().toISOString()
    };
    this.save(config);
    return true;
  }

  /**
   * Remove an MCP server
   */
  removeMcpServer(name) {
    const config = this.read();
    if (config.mcpServers && config.mcpServers[name]) {
      delete config.mcpServers[name];
      this.save(config);
      return true;
    }
    return false;
  }

  /**
   * Get configuration file paths
   */
  getConfigPaths() {
    return {
      global: this.globalConfigFile,
      globalDir: this.globalConfigDir
    };
  }
}

module.exports = GlobalConfigManager;
