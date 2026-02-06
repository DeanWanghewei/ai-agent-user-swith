/**
 * ConfigManager - Facade for configuration management
 * Delegates to specialized managers for global, project, and MCP configuration
 */
const GlobalConfigManager = require('./config/global-config');
const ProjectConfigManager = require('./config/project-config');
const MCPManager = require('./mcp/mcp-manager');
const { createGenerator } = require('./generators');
const { GITIGNORE_ENTRIES } = require('./constants');
const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.globalConfig = new GlobalConfigManager();
    this.projectConfig = new ProjectConfigManager(this.globalConfig);
    this.mcpManager = new MCPManager(this.globalConfig, this.projectConfig);
  }

  findProjectRoot(startDir) {
    return this.globalConfig.findProjectRoot(startDir);
  }

  getAccountByIdOrName(idOrName) {
    return this.globalConfig.getAccountByIdOrName(idOrName);
  }

  addAccount(name, accountData) {
    return this.globalConfig.addAccount(name, accountData);
  }

  getAllAccounts() {
    return this.globalConfig.getAllAccounts();
  }

  getAccount(name) {
    return this.globalConfig.getAccount(name);
  }

  removeAccount(name) {
    return this.globalConfig.removeAccount(name);
  }

  accountExists(name) {
    return this.globalConfig.accountExists(name);
  }

  getProjectAccount() {
    return this.projectConfig.getAccount();
  }

  setProjectAccount(accountName) {
    const account = this.globalConfig.getAccount(accountName);
    if (!account) {
      return false;
    }

    const projectRoot = process.cwd();
    this.projectConfig.setAccount(accountName, projectRoot);

    const { ACCOUNT_TYPES } = require('./constants');
    const generator = createGenerator(account.type, projectRoot);

    if (account.type === ACCOUNT_TYPES.CODEX) {
      generator.generate(account);
    } else if (account.type === ACCOUNT_TYPES.DROIDS) {
      generator.generate(account);
    } else if (account.type === ACCOUNT_TYPES.CCR) {
      generator.generate(account);
    } else {
      generator.generate(account);
      this.mcpManager.generateMcpJson(account, projectRoot);
    }

    this.addToGitignore(projectRoot);
    return true;
  }

  addMcpServer(name, serverData) {
    return this.globalConfig.addMcpServer(name, serverData);
  }

  getAllMcpServers() {
    return this.globalConfig.getAllMcpServers();
  }

  getMcpServer(name) {
    return this.globalConfig.getMcpServer(name);
  }

  updateMcpServer(name, serverData) {
    return this.globalConfig.updateMcpServer(name, serverData);
  }

  removeMcpServer(name) {
    return this.globalConfig.removeMcpServer(name);
  }

  getProjectMcpServers() {
    return this.projectConfig.getMcpServers();
  }

  isMcpServerEnabledInCurrentProject(serverName) {
    return this.projectConfig.isMcpServerEnabled(serverName);
  }

  removeMcpServerFromCurrentProject(serverName) {
    return this.projectConfig.removeMcpServer(serverName);
  }

  enableProjectMcpServer(serverName, scope) {
    return this.projectConfig.enableMcpServer(serverName, scope);
  }

  disableProjectMcpServer(serverName) {
    return this.projectConfig.disableMcpServer(serverName);
  }

  getEnabledMcpServers() {
    return this.mcpManager.getEnabledServers();
  }

  getAllAvailableMcpServers() {
    return this.mcpManager.getAllServers();
  }

  getClaudeUserConfigPath() {
    return this.mcpManager.getClaudeUserConfigPath();
  }

  importMcpServersFromClaudeConfig(projectRoot) {
    return this.mcpManager.importFromClaudeConfig(projectRoot);
  }

  importMcpServersFromFile(projectRoot) {
    return this.mcpManager.importFromFile(projectRoot);
  }

  syncMcpConfig() {
    return this.mcpManager.syncConfig();
  }

  generateClaudeConfig(account, projectRoot) {
    const generator = createGenerator(account.type, projectRoot || process.cwd());
    generator.generate(account);
  }

  generateClaudeConfigWithMcp(account, projectRoot) {
    projectRoot = projectRoot || process.cwd();
    const generator = createGenerator(account.type, projectRoot);
    generator.generate(account);
    this.mcpManager.generateMcpJson(account, projectRoot);
  }

  generateCodexConfig(account, projectRoot) {
    const generator = createGenerator(account.type, projectRoot || process.cwd());
    return generator.generate(account);
  }

  generateDroidsConfig(account, projectRoot) {
    const generator = createGenerator(account.type, projectRoot || process.cwd());
    generator.generate(account);
  }

  generateCCRConfig(account, projectRoot) {
    const generator = createGenerator(account.type, projectRoot || process.cwd());
    generator.generateCCRConfig?.(account) || generator.generate(account);
  }

  generateClaudeConfigForCCR(account, projectRoot) {
    const generator = createGenerator(account.type, projectRoot || process.cwd());
    generator.generateClaudeConfigForCCR?.(account) || generator.generate(account);
  }

  addToGitignore(projectRoot = process.cwd()) {
    const gitDir = path.join(projectRoot, '.git');
    const gitignorePath = path.join(projectRoot, '.gitignore');

    if (!fs.existsSync(gitDir)) {
      return false;
    }

    let gitignoreContent = '';
    let needsUpdate = false;

    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    const lines = gitignoreContent.split('\n');
    const existingEntries = new Set(lines.map(line => line.trim()));

    const entriesToAdd = [];
    for (const file of GITIGNORE_ENTRIES) {
      if (!existingEntries.has(file)) {
        entriesToAdd.push(file);
        needsUpdate = true;
      }
    }

    if (!needsUpdate) {
      return false;
    }

    let newContent = gitignoreContent;

    if (newContent.length > 0 && !newContent.endsWith('\n')) {
      newContent += '\n';
    }

    if (entriesToAdd.length > 0) {
      if (newContent.length > 0) {
        newContent += '\n';
      }

      newContent += '# AIS (AI Account Switch) - Local configuration files\n';
      entriesToAdd.forEach(entry => {
        newContent += entry + '\n';
      });
    }

    fs.writeFileSync(gitignorePath, newContent, 'utf8');
    return true;
  }

  getConfigPaths() {
    return {
      ...this.globalConfig.getConfigPaths(),
      project: path.join(process.cwd(), '.ais-project-config')
    };
  }
}

const { WIRE_API_MODES, DEFAULT_WIRE_API, ACCOUNT_TYPES, MCP_SCOPES, DEFAULT_MCP_SCOPE } = require('./constants');

module.exports = ConfigManager;
module.exports.WIRE_API_MODES = WIRE_API_MODES;
module.exports.DEFAULT_WIRE_API = DEFAULT_WIRE_API;
module.exports.ACCOUNT_TYPES = ACCOUNT_TYPES;
module.exports.MCP_SCOPES = MCP_SCOPES;
module.exports.DEFAULT_MCP_SCOPE = DEFAULT_MCP_SCOPE;
