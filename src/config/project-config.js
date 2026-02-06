/**
 * Project Configuration Manager
 * Handles project-specific configuration operations
 */
const fs = require('fs');
const path = require('path');

class ProjectConfigManager {
  constructor(globalConfig) {
    this.globalConfig = globalConfig;
    this.projectConfigFilename = '.ais-project-config';
  }

  /**
   * Get project configuration file path
   */
  getProjectConfigPath(projectRoot = process.cwd()) {
    return path.join(projectRoot, this.projectConfigFilename);
  }

  /**
   * Read project configuration
   */
  read(projectRoot = process.cwd()) {
    const projectConfigFile = this.getProjectConfigPath(projectRoot);
    if (!fs.existsSync(projectConfigFile)) {
      return null;
    }

    try {
      const data = fs.readFileSync(projectConfigFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Save project configuration
   */
  save(projectConfig, projectRoot = process.cwd()) {
    const projectConfigFile = this.getProjectConfigPath(projectRoot);
    fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 2), 'utf8');
  }

  /**
   * Set current project's active account
   */
  setAccount(accountName, projectRoot = process.cwd()) {
    const projectConfigFile = this.getProjectConfigPath(projectRoot);

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

    this.save(projectConfig, projectRoot);
    return true;
  }

  /**
   * Get current project's active account with full details
   */
  getAccount(projectRoot = process.cwd()) {
    try {
      const projectConfig = this.read(projectRoot);
      if (!projectConfig) {
        return null;
      }

      // Get the full account details from global config
      const account = this.globalConfig.getAccount(projectConfig.activeAccount);
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

  // MCP Server methods for project

  /**
   * Get project's enabled MCP servers
   */
  getMcpServers(projectRoot = process.cwd()) {
    try {
      const projectConfig = this.read(projectRoot);
      if (!projectConfig) {
        return [];
      }
      return projectConfig.enabledMcpServers || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if MCP server is enabled in current project
   */
  isMcpServerEnabled(serverName, projectRoot = process.cwd()) {
    try {
      const projectConfig = this.read(projectRoot);
      if (!projectConfig) {
        return false;
      }

      return projectConfig.enabledMcpServers &&
             projectConfig.enabledMcpServers.includes(serverName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Enable MCP server for current project with scope
   */
  enableMcpServer(serverName, scope, projectRoot = process.cwd()) {
    const projectConfigFile = this.getProjectConfigPath(projectRoot);
    if (!fs.existsSync(projectConfigFile)) {
      throw new Error('Project not configured. Run "ais use" first.');
    }

    const data = fs.readFileSync(projectConfigFile, 'utf8');
    const projectConfig = JSON.parse(data);

    // Update server scope in global config
    const globalConfig = this.globalConfig.read();
    if (globalConfig.mcpServers[serverName]) {
      globalConfig.mcpServers[serverName].scope = scope;
      this.globalConfig.save(globalConfig);
    }

    // Handle different scopes
    const { MCP_SCOPES } = require('../constants');
    if (scope === MCP_SCOPES.LOCAL) {
      if (!projectConfig.enabledMcpServers) projectConfig.enabledMcpServers = [];
      if (!projectConfig.enabledMcpServers.includes(serverName)) {
        projectConfig.enabledMcpServers.push(serverName);
      }
    } else if (scope === MCP_SCOPES.PROJECT) {
      if (!projectConfig.projectMcpServers) projectConfig.projectMcpServers = {};
      const server = this.globalConfig.getMcpServer(serverName);
      projectConfig.projectMcpServers[serverName] = {
        ...server,
        scope: MCP_SCOPES.PROJECT
      };

      if (!projectConfig.enabledMcpServers) projectConfig.enabledMcpServers = [];
      if (!projectConfig.enabledMcpServers.includes(serverName)) {
        projectConfig.enabledMcpServers.push(serverName);
      }
    } else if (scope === MCP_SCOPES.USER) {
      if (!projectConfig.enabledMcpServers) projectConfig.enabledMcpServers = [];
      if (!projectConfig.enabledMcpServers.includes(serverName)) {
        projectConfig.enabledMcpServers.push(serverName);
      }
    }

    this.save(projectConfig, projectRoot);
    return true;
  }

  /**
   * Disable MCP server for current project
   */
  disableMcpServer(serverName, projectRoot = process.cwd()) {
    const projectConfig = this.read(projectRoot);
    if (!projectConfig) {
      throw new Error('Project not configured. Run "ais use" first.');
    }

    if (!projectConfig.enabledMcpServers) return false;

    const index = projectConfig.enabledMcpServers.indexOf(serverName);
    if (index > -1) {
      projectConfig.enabledMcpServers.splice(index, 1);
      this.save(projectConfig, projectRoot);
      return true;
    }
    return false;
  }

  /**
   * Remove MCP server from current project's enabled list
   */
  removeMcpServer(serverName, projectRoot = process.cwd()) {
    try {
      const projectConfig = this.read(projectRoot);
      if (!projectConfig) {
        return false;
      }

      if (!projectConfig.enabledMcpServers) return false;

      const index = projectConfig.enabledMcpServers.indexOf(serverName);
      if (index > -1) {
        projectConfig.enabledMcpServers.splice(index, 1);
        this.save(projectConfig, projectRoot);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all available MCP servers including project-scoped ones
   */
  getAllMcpServers(projectRoot = process.cwd()) {
    const globalServers = this.globalConfig.getAllMcpServers();

    try {
      const projectConfig = this.read(projectRoot);
      if (!projectConfig) {
        return globalServers;
      }

      // Merge global and project servers
      const allServers = { ...globalServers };

      if (projectConfig.projectMcpServers) {
        Object.entries(projectConfig.projectMcpServers).forEach(([name, server]) => {
          allServers[name] = server;
        });
      }

      return allServers;
    } catch (error) {
      return globalServers;
    }
  }
}

module.exports = ProjectConfigManager;
