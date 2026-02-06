/**
 * MCP Manager
 * Handles MCP server configuration and synchronization
 */
const fs = require('fs');
const path = require('path');
const { MCP_SCOPES } = require('../constants');

class MCPManager {
  constructor(globalConfig, projectConfig) {
    this.globalConfig = globalConfig;
    this.projectConfig = projectConfig;
  }

  /**
   * Get enabled MCP servers for current project
   * Includes local, project, and user-scoped servers
   */
  getEnabledServers() {
    const projectServers = this.projectConfig.getMcpServers();
    const globalServers = this.globalConfig.getAllMcpServers();

    // Add user-scoped servers that are globally enabled
    const userScopedServers = Object.keys(globalServers).filter(name =>
      globalServers[name].scope === MCP_SCOPES.USER && !projectServers.includes(name)
    );

    return [...projectServers, ...userScopedServers];
  }

  /**
   * Get all available MCP servers including project-scoped ones
   */
  getAllServers() {
    const globalServers = this.globalConfig.getAllMcpServers();
    return this.projectConfig.getAllMcpServers();
  }

  /**
   * Get Claude Code user config path (cross-platform)
   */
  getClaudeUserConfigPath() {
    const platform = process.platform;
    const home = process.env.HOME || process.env.USERPROFILE;

    if (!home) return null;

    const locations = [];

    // Primary location: ~/.claude/settings.json
    locations.push(path.join(home, '.claude', 'settings.json'));

    if (platform === 'win32') {
      const appData = process.env.APPDATA;
      if (appData) {
        locations.push(path.join(appData, 'claude', 'settings.json'));
        locations.push(path.join(appData, 'claude', 'config.json'));
      }
    } else {
      locations.push(path.join(home, '.config', 'claude', 'settings.json'));
      locations.push(path.join(home, '.config', 'claude', 'config.json'));
    }

    locations.push(path.join(home, '.claude.json'));

    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        return loc;
      }
    }

    return null;
  }

  /**
   * Import MCP servers from Claude user config
   */
  importFromClaudeConfig(projectRoot) {
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
      const allServers = this.globalConfig.getAllMcpServers();

      // Import from user-level MCP servers
      if (claudeConfig.mcpServers && typeof claudeConfig.mcpServers === 'object') {
        Object.entries(claudeConfig.mcpServers).forEach(([name, serverConfig]) => {
          if (!allServers[name]) {
            const aisServerData = {
              name: name,
              ...serverConfig,
              description: serverConfig.description || 'Imported from Claude user config'
            };

            if (!aisServerData.type) {
              if (aisServerData.command) {
                aisServerData.type = 'stdio';
              } else if (aisServerData.url) {
                aisServerData.type = 'http';
              }
            }

            this.globalConfig.addMcpServer(name, aisServerData);
            imported.push(name);
            fromUserConfig.push(name);
          }
        });
      }

      // Import from project-specific MCP servers
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

              if (!aisServerData.type) {
                if (aisServerData.command) {
                  aisServerData.type = 'stdio';
                } else if (aisServerData.url) {
                  aisServerData.type = 'http';
                }
              }

              this.globalConfig.addMcpServer(name, aisServerData);
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
   */
  importFromFile(projectRoot) {
    const { CONFIG_FILES } = require('../constants');
    const mcpJsonFile = path.join(projectRoot, CONFIG_FILES.MCP_CONFIG);
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
      const allServers = this.globalConfig.getAllMcpServers();

      Object.entries(mcpJson.mcpServers).forEach(([name, serverConfig]) => {
        if (!allServers[name]) {
          const aisServerData = {
            name: name,
            ...serverConfig,
            description: serverConfig.description || 'Imported from .mcp.json'
          };

          if (!aisServerData.type) {
            if (aisServerData.command) {
              aisServerData.type = 'stdio';
            } else if (aisServerData.url) {
              aisServerData.type = 'http';
            }
          }

          this.globalConfig.addMcpServer(name, aisServerData);
          imported.push(name);
        }
        enabled.push(name);
      });

      // Update project's enabled servers list
      if (enabled.length > 0) {
        const projectConfigFile = path.join(projectRoot, '.ais-project-config');
        const projectData = fs.readFileSync(projectConfigFile, 'utf8');
        const projectConfig = JSON.parse(projectData);

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
   */
  syncConfig() {
    const projectRoot = this.globalConfig.findProjectRoot();
    if (!projectRoot) {
      throw new Error('Not in a project directory');
    }

    const projectConfigFile = path.join(projectRoot, '.ais-project-config');
    if (!fs.existsSync(projectConfigFile)) {
      throw new Error('Project not configured. Run "ais use" first');
    }

    // Import servers from Claude user config
    const claudeImport = this.importFromClaudeConfig(projectRoot);

    // Import servers from .mcp.json
    const fileImport = this.importFromFile(projectRoot);

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
  }

  /**
   * Generate .mcp.json for MCP servers configuration
   */
  generateMcpJson(account, projectRoot) {
    const { CONFIG_FILES } = require('../constants');
    const mcpConfigFile = path.join(projectRoot, CONFIG_FILES.MCP_CONFIG);

    const enabledServers = this.getEnabledServers();
    const allServers = this.getAllServers();

    // Only project-scoped servers should be in .mcp.json
    const projectScopedServers = enabledServers.filter(serverName => {
      const server = allServers[serverName];
      return server && server.scope === MCP_SCOPES.PROJECT;
    });

    if (projectScopedServers.length > 0) {
      const mcpConfig = { mcpServers: {} };

      projectScopedServers.forEach(serverName => {
        const server = allServers[serverName];
        if (server) {
          const serverConfig = {};

          if (server.type === 'stdio' && server.command) {
            serverConfig.command = server.command;
            if (server.args) serverConfig.args = server.args;
            if (server.env) serverConfig.env = server.env;
          } else if ((server.type === 'http' || server.type === 'sse') && server.url) {
            serverConfig.type = server.type;
            serverConfig.url = server.url;
            if (server.headers) serverConfig.headers = server.headers;
          } else if (server.command) {
            serverConfig.command = server.command;
            if (server.args) serverConfig.args = server.args;
            if (server.env) serverConfig.env = server.env;
          } else if (server.url) {
            serverConfig.type = server.type || 'http';
            serverConfig.url = server.url;
            if (server.headers) serverConfig.headers = server.headers;
          }

          mcpConfig.mcpServers[serverName] = serverConfig;
        }
      });

      fs.writeFileSync(mcpConfigFile, JSON.stringify(mcpConfig, null, 2), 'utf8');
    } else {
      if (fs.existsSync(mcpConfigFile)) {
        fs.unlinkSync(mcpConfigFile);
      }
    }
  }
}

module.exports = MCPManager;
