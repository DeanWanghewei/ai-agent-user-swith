const inquirer = require('inquirer');
const chalk = require('chalk');
const { spawn } = require('child_process');
const ConfigManager = require('../config');

const config = new ConfigManager();

/**
 * Add a new MCP server
 */
async function addMcpServer(name) {
  try {
    const { MCP_SCOPES, DEFAULT_MCP_SCOPE } = require('../config');

    if (!name) {
      const { serverName } = await inquirer.prompt([{
        type: 'input',
        name: 'serverName',
        message: 'Enter MCP server name:',
        validate: input => input.trim() ? true : 'Server name is required'
      }]);
      name = serverName;
    }

    if (config.getMcpServer(name)) {
      console.log(chalk.red(`✗ MCP server '${name}' already exists`));
      return;
    }

    const { type } = await inquirer.prompt([{
      type: 'list',
      name: 'type',
      message: 'Select MCP server type:',
      choices: ['stdio', 'sse', 'http']
    }]);

    let serverData = { name, type };

    if (type === 'stdio') {
      const { command, args } = await inquirer.prompt([
        { type: 'input', name: 'command', message: 'Enter command:', validate: input => input.trim() ? true : 'Command is required' },
        { type: 'input', name: 'args', message: 'Enter arguments (comma-separated):', default: '' }
      ]);
      serverData.command = command;
      serverData.args = args ? args.split(',').map(a => a.trim()) : [];

      const { addEnv } = await inquirer.prompt([{ type: 'confirm', name: 'addEnv', message: 'Add environment variables?', default: false }]);
      if (addEnv) {
        serverData.env = {};
        let addMore = true;
        while (addMore) {
          const { envVar } = await inquirer.prompt([{ type: 'input', name: 'envVar', message: 'Environment variable (KEY=VALUE):' }]);
          if (envVar.includes('=')) {
            const [key, ...valueParts] = envVar.split('=');
            serverData.env[key.trim()] = valueParts.join('=').trim();
          }
          const { more } = await inquirer.prompt([{ type: 'confirm', name: 'more', message: 'Add another?', default: false }]);
          addMore = more;
        }
      }
    } else {
      const { url } = await inquirer.prompt([{ type: 'input', name: 'url', message: 'Enter URL:', validate: input => input.trim() ? true : 'URL is required' }]);
      serverData.url = url;

      const { addHeaders } = await inquirer.prompt([{ type: 'confirm', name: 'addHeaders', message: 'Add headers?', default: false }]);
      if (addHeaders) {
        serverData.headers = {};
        let addMore = true;
        while (addMore) {
          const { header } = await inquirer.prompt([{ type: 'input', name: 'header', message: 'Header (KEY=VALUE):' }]);
          if (header.includes('=')) {
            const [key, ...valueParts] = header.split('=');
            serverData.headers[key.trim()] = valueParts.join('=').trim();
          }
          const { more } = await inquirer.prompt([{ type: 'confirm', name: 'more', message: 'Add another?', default: false }]);
          addMore = more;
        }
      }
    }

    const { description } = await inquirer.prompt([{ type: 'input', name: 'description', message: 'Enter description:', default: '' }]);
    serverData.description = description;

    // Ask for default scope
    const { scope } = await inquirer.prompt([{
      type: 'list',
      name: 'scope',
      message: 'Select default scope (默认作用范围):',
      choices: [
        { name: 'local - Only current project (仅当前项目)', value: MCP_SCOPES.LOCAL },
        { name: 'project - Share with project members (与项目成员共享)', value: MCP_SCOPES.PROJECT },
        { name: 'user - All projects for current user (当前用户所有项目)', value: MCP_SCOPES.USER }
      ],
      default: DEFAULT_MCP_SCOPE
    }]);
    serverData.scope = scope;

    config.addMcpServer(name, serverData);
    console.log(chalk.green(`✓ MCP server '${name}' added successfully with scope: ${scope}!`));

    // Auto-test the server
    console.log(chalk.cyan('\nTesting server availability...'));
    const result = await testMcpConnection(serverData);
    if (result.success) {
      console.log(chalk.green('✓ Server is available'));
      if (result.message) console.log(chalk.gray(`  ${result.message}`));
    } else {
      console.log(chalk.yellow('⚠ Server test failed:'), result.error);
    }
  } catch (error) {
    console.error(chalk.red('✗ Error adding MCP server:'), error.message);
  }
}

/**
 * List all MCP servers
 */
async function listMcpServers() {
  try {
    const servers = config.getAllAvailableMcpServers();
    const projectServers = config.getEnabledMcpServers();

    if (Object.keys(servers).length === 0) {
      console.log(chalk.yellow('No MCP servers configured'));
      return;
    }

    console.log(chalk.bold.cyan('\n📋 Available MCP servers:\n'));
    console.log('  Name         Type    Active   Scope      Description');
    console.log('  ───────────────────────────────────────────────────────────────────────');

    Object.entries(servers).forEach(([key, server]) => {
      const name = server.name || key;
      const type = server.type || 'unknown';
      const isActive = projectServers.includes(name) ? chalk.green('✓') : ' ';
      const scope = server.scope || 'local';
      const scopeDisplay = scope.padEnd(10);
      console.log(`  ${name.padEnd(12)} ${type.padEnd(7)} ${isActive}        ${scopeDisplay} ${server.description || ''}`);
    });

    const activeCount = projectServers.length;
    const totalCount = Object.keys(servers).length;
    const inProject = config.findProjectRoot() ? ' in current project' : '';
    console.log(`\n  Total: ${totalCount} servers (${activeCount} active${inProject})\n`);
  } catch (error) {
    console.error(chalk.red('✗ Error listing MCP servers:'), error.message);
  }
}

/**
 * Show MCP server details
 */
async function showMcpServer(name) {
  try {
    if (!name) {
      const servers = config.getAllAvailableMcpServers();
      if (Object.keys(servers).length === 0) {
        console.log(chalk.yellow('No MCP servers configured'));
        return;
      }
      const { serverName } = await inquirer.prompt([{
        type: 'list',
        name: 'serverName',
        message: 'Select MCP server:',
        choices: Object.keys(servers)
      }]);
      name = serverName;
    }

    const server = config.getMcpServer(name);
    if (!server) {
      console.log(chalk.red(`✗ MCP server '${name}' not found`));
      return;
    }

    console.log(chalk.bold.cyan(`\n📋 MCP Server: ${name}\n`));
    console.log(chalk.bold('Type:'), server.type);
    console.log(chalk.bold('Scope:'), server.scope || 'local');
    console.log(chalk.bold('Description:'), server.description || 'N/A');

    if (server.command) console.log(chalk.bold('Command:'), server.command);
    if (server.args) console.log(chalk.bold('Arguments:'), server.args.join(', '));
    if (server.url) console.log(chalk.bold('URL:'), server.url);
    if (server.env) console.log(chalk.bold('Environment:'), JSON.stringify(server.env, null, 2));
    if (server.headers) console.log(chalk.bold('Headers:'), JSON.stringify(server.headers, null, 2));

    console.log(chalk.bold('Created:'), server.createdAt);
    console.log(chalk.bold('Updated:'), server.updatedAt);
    console.log();
  } catch (error) {
    console.error(chalk.red('✗ Error showing MCP server:'), error.message);
  }
}

/**
 * Update MCP server
 */
async function updateMcpServer(name) {
  try {
    if (!name) {
      const servers = config.getAllMcpServers();
      if (Object.keys(servers).length === 0) {
        console.log(chalk.yellow('No MCP servers configured'));
        return;
      }
      const { serverName } = await inquirer.prompt([{
        type: 'list',
        name: 'serverName',
        message: 'Select MCP server to update:',
        choices: Object.keys(servers)
      }]);
      name = serverName;
    }

    const server = config.getMcpServer(name);
    if (!server) {
      console.log(chalk.red(`✗ MCP server '${name}' not found`));
      return;
    }

    console.log(chalk.cyan(`Updating MCP server '${name}'`));

    const { description } = await inquirer.prompt([{
      type: 'input',
      name: 'description',
      message: 'Enter new description (leave empty to keep current):',
      default: server.description
    }]);

    const updatedData = { ...server, description };

    if (server.type === 'stdio') {
      const { command, args } = await inquirer.prompt([
        { type: 'input', name: 'command', message: 'Enter command:', default: server.command },
        { type: 'input', name: 'args', message: 'Enter arguments (comma-separated):', default: server.args?.join(', ') || '' }
      ]);
      updatedData.command = command;
      updatedData.args = args ? args.split(',').map(a => a.trim()) : [];
    } else {
      const { url } = await inquirer.prompt([{
        type: 'input',
        name: 'url',
        message: 'Enter URL:',
        default: server.url
      }]);
      updatedData.url = url;
    }

    config.updateMcpServer(name, updatedData);
    console.log(chalk.green(`✓ MCP server '${name}' updated successfully!`));

    // Sync to .mcp.json if this server is active in current project
    const enabledServers = config.getEnabledMcpServers();
    if (enabledServers.includes(name)) {
      try {
        config.syncMcpConfig();
        console.log(chalk.green('✓ Configuration synced to .mcp.json'));
      } catch (syncError) {
        // If not in a project, that's okay
        if (!syncError.message.includes('Not in a project')) {
          console.log(chalk.yellow(`⚠ Warning: Could not sync to project: ${syncError.message}`));
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('✗ Error updating MCP server:'), error.message);
  }
}

/**
 * Remove MCP server
 */
async function removeMcpServer(name) {
  try {
    if (!name) {
      const servers = config.getAllMcpServers();
      if (Object.keys(servers).length === 0) {
        console.log(chalk.yellow('No MCP servers configured'));
        return;
      }
      const { serverName } = await inquirer.prompt([{
        type: 'list',
        name: 'serverName',
        message: 'Select MCP server to remove:',
        choices: Object.keys(servers)
      }]);
      name = serverName;
    }

    // Check if server exists
    const server = config.getMcpServer(name);
    if (!server) {
      console.log(chalk.red(`✗ MCP server '${name}' not found`));
      return;
    }

    // Check if server is enabled in current project
    const isEnabledInCurrentProject = config.isMcpServerEnabledInCurrentProject(name);

    if (isEnabledInCurrentProject) {
      console.log(chalk.yellow(`\n⚠ Warning: MCP server '${name}' is currently enabled in this project.`));
      console.log(chalk.gray('  Removing it will also disable it from the current project.\n'));
    }

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Remove MCP server '${name}'?`,
      default: false
    }]);

    if (!confirm) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }

    // Remove from global config
    if (config.removeMcpServer(name)) {
      console.log(chalk.green(`✓ MCP server '${name}' removed from global configuration`));

      // If enabled in current project, remove it and sync
      if (isEnabledInCurrentProject) {
        if (config.removeMcpServerFromCurrentProject(name)) {
          console.log(chalk.green(`✓ MCP server '${name}' disabled from current project`));

          // Sync configuration to update .mcp.json
          try {
            config.syncMcpConfig();
            console.log(chalk.green('✓ Project configuration synced'));
          } catch (syncError) {
            console.log(chalk.yellow(`⚠ Warning: Could not sync project configuration: ${syncError.message}`));
          }
        }
      }
    } else {
      console.log(chalk.red(`✗ MCP server '${name}' not found`));
    }
  } catch (error) {
    console.error(chalk.red('✗ Error removing MCP server:'), error.message);
  }
}

/**
 * Enable MCP server for current project
 */
async function enableMcpServer(name, options = {}) {
  try {
    const { MCP_SCOPES, DEFAULT_MCP_SCOPE } = require('../config');
    let scope = options.scope || DEFAULT_MCP_SCOPE;

    // Validate scope
    if (!Object.values(MCP_SCOPES).includes(scope)) {
      console.log(chalk.red(`✗ Invalid scope '${scope}'. Valid scopes: local, project, user`));
      return;
    }

    if (!name) {
      const servers = config.getAllMcpServers();
      const enabled = config.getEnabledMcpServers();
      const available = Object.keys(servers).filter(s => !enabled.includes(s));

      if (available.length === 0) {
        console.log(chalk.yellow('No MCP servers available to activate'));
        return;
      }

      const { serverName } = await inquirer.prompt([{
        type: 'list',
        name: 'serverName',
        message: 'Select MCP server to activate:',
        choices: available
      }]);
      name = serverName;

      // Ask for scope if not provided
      if (!options.scope) {
        const { selectedScope } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedScope',
          message: 'Select scope (作用范围):',
          choices: [
            { name: 'local - Only current project (仅当前项目)', value: MCP_SCOPES.LOCAL },
            { name: 'project - Share with project members via .mcp.json (通过 .mcp.json 与项目成员共享)', value: MCP_SCOPES.PROJECT },
            { name: 'user - All projects for current user (当前用户所有项目)', value: MCP_SCOPES.USER }
          ],
          default: DEFAULT_MCP_SCOPE
        }]);
        scope = selectedScope;
      }
    }

    if (config.enableProjectMcpServer(name, scope)) {
      config.syncMcpConfig();
      console.log(chalk.green(`✓ MCP server '${name}' activated for current project with scope: ${scope}`));
      console.log(chalk.green('✓ Claude configuration updated'));

      // Show scope-specific information
      if (scope === MCP_SCOPES.LOCAL) {
        console.log(chalk.cyan('  Scope: local - Only available in this project'));
      } else if (scope === MCP_SCOPES.PROJECT) {
        console.log(chalk.cyan('  Scope: project - Configuration stored in project, shared with team members'));
        console.log(chalk.gray('  Note: Make sure to commit .ais-project-config to share with your team'));
      } else if (scope === MCP_SCOPES.USER) {
        console.log(chalk.cyan('  Scope: user - Available to all your projects'));
      }
    } else {
      console.log(chalk.red(`✗ MCP server '${name}' not found`));
    }
  } catch (error) {
    console.error(chalk.red('✗ Error activating MCP server:'), error.message);
  }
}

/**
 * Disable MCP server for current project
 */
async function disableMcpServer(name) {
  try {
    if (!name) {
      const enabled = config.getEnabledMcpServers();
      if (enabled.length === 0) {
        console.log(chalk.yellow('No MCP servers active'));
        return;
      }

      const { serverName } = await inquirer.prompt([{
        type: 'list',
        name: 'serverName',
        message: 'Select MCP server to deactivate:',
        choices: enabled
      }]);
      name = serverName;
    }

    if (config.disableProjectMcpServer(name)) {
      config.syncMcpConfig();
      console.log(chalk.green(`✓ MCP server '${name}' deactivated for current project`));
      console.log(chalk.green('✓ Claude configuration updated'));
    } else {
      console.log(chalk.red(`✗ MCP server '${name}' not active`));
    }
  } catch (error) {
    console.error(chalk.red('✗ Error deactivating MCP server:'), error.message);
  }
}

/**
 * Show active MCP servers
 */
async function showEnabledMcpServers() {
  try {
    const enabled = config.getEnabledMcpServers();
    const servers = config.getAllMcpServers();

    if (enabled.length === 0) {
      console.log(chalk.yellow('No MCP servers active for current project'));
      return;
    }

    console.log(chalk.bold.cyan('\n📋 Active MCP servers for current project:\n'));
    console.log('  Name         Type    Description');
    console.log('  ────────────────────────────────────────────────');

    enabled.forEach(name => {
      const server = servers[name];
      if (server) {
        const serverName = server.name || name;
        const type = server.type || 'unknown';
        console.log(`  ${String(serverName).padEnd(12)} ${String(type).padEnd(7)} ${server.description || ''}`);
      }
    });

    console.log(`\n  Total: ${enabled.length} servers active\n`);
  } catch (error) {
    console.error(chalk.red('✗ Error showing active MCP servers:'), error.message);
  }
}

/**
 * Sync MCP configuration (bidirectional)
 */
async function syncMcpConfig() {
  try {
    console.log(chalk.cyan('Syncing MCP configuration...\n'));

    const result = config.syncMcpConfig();

    let hasImports = false;

    // Show imports from Claude user config
    if (result.fromClaudeUserConfig && result.fromClaudeUserConfig.length > 0) {
      console.log(chalk.green('✓ Imported from Claude user config (~/.claude.json):'));
      result.fromClaudeUserConfig.forEach(name => {
        console.log(chalk.gray(`  • ${name}`));
      });
      console.log();
      hasImports = true;
    }

    // Show imports from Claude project config
    if (result.fromClaudeProjectConfig && result.fromClaudeProjectConfig.length > 0) {
      console.log(chalk.green('✓ Imported from Claude project config:'));
      result.fromClaudeProjectConfig.forEach(name => {
        console.log(chalk.gray(`  • ${name}`));
      });
      console.log();
      hasImports = true;
    }

    // Show imports from .mcp.json
    if (result.fromMcpJson && result.fromMcpJson.length > 0) {
      console.log(chalk.green('✓ Imported from .mcp.json:'));
      result.fromMcpJson.forEach(name => {
        console.log(chalk.gray(`  • ${name}`));
      });
      console.log();
      hasImports = true;
    }

    // Show active servers
    if (result.enabled && result.enabled.length > 0) {
      console.log(chalk.green(`✓ Total ${result.enabled.length} MCP server(s) synced to .mcp.json`));
      result.enabled.forEach(name => {
        const wasImported = result.imported && result.imported.includes(name);
        const marker = wasImported ? chalk.yellow('(new)') : '';
        console.log(chalk.gray(`  • ${name} ${marker}`));
      });
      console.log();
    }

    if (!hasImports && (!result.enabled || result.enabled.length === 0)) {
      console.log(chalk.yellow('No MCP servers to sync'));
    } else {
      console.log(chalk.green('✓ MCP configuration synced successfully'));
    }
  } catch (error) {
    console.error(chalk.red('✗ Error syncing MCP configuration:'), error.message);
  }
}

/**
 * Test MCP server availability
 */
async function testMcpServer(name) {
  try {
    if (!name) {
      const servers = config.getAllMcpServers();
      if (Object.keys(servers).length === 0) {
        console.log(chalk.yellow('No MCP servers configured'));
        return;
      }
      const { serverName } = await inquirer.prompt([{
        type: 'list',
        name: 'serverName',
        message: 'Select MCP server to test:',
        choices: Object.keys(servers)
      }]);
      name = serverName;
    }

    const server = config.getMcpServer(name);
    if (!server) {
      console.log(chalk.red(`✗ MCP server '${name}' not found`));
      return;
    }

    console.log(chalk.cyan(`\nTesting MCP server '${name}'...\n`));
    const result = await testMcpConnection(server);

    if (result.success) {
      console.log(chalk.green(`✓ MCP server '${name}' is available`));
      if (result.message) console.log(chalk.gray(`  ${result.message}`));
    } else {
      console.log(chalk.red(`✗ MCP server '${name}' is not available`));
      if (result.error) console.log(chalk.red(`  Error: ${result.error}`));
    }
  } catch (error) {
    console.error(chalk.red('✗ Error testing MCP server:'), error.message);
  }
}

/**
 * Test MCP server connection
 */
async function testMcpConnection(server) {
  if (server.type === 'stdio') {
    return new Promise((resolve) => {
      let resolved = false;
      const safeResolve = (result) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      try {
        const proc = spawn(server.command, server.args || [], {
          env: { ...process.env, ...server.env },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const timeout = setTimeout(() => {
          if (!resolved) {
            proc.kill();
            safeResolve({ success: false, error: 'Connection timeout (5s)' });
          }
        }, 5000);

        proc.on('error', (err) => {
          clearTimeout(timeout);
          safeResolve({ success: false, error: `Failed to start process: ${err.message}` });
        });

        // Consider the process successful if it spawns without immediate error
        proc.on('spawn', () => {
          clearTimeout(timeout);
          proc.kill();
          safeResolve({ success: true, message: 'Process spawned successfully' });
        });

        // Some processes might output to stderr for logging, not necessarily errors
        let hasOutput = false;
        proc.stdout.on('data', () => {
          if (!hasOutput) {
            hasOutput = true;
            clearTimeout(timeout);
            proc.kill();
            safeResolve({ success: true, message: 'Process started and producing output' });
          }
        });

        proc.on('exit', (code, signal) => {
          clearTimeout(timeout);
          if (!resolved) {
            if (code === 0) {
              safeResolve({ success: true, message: 'Process exited cleanly' });
            } else {
              safeResolve({ success: false, error: `Process exited with code ${code}` });
            }
          }
        });
      } catch (error) {
        safeResolve({ success: false, error: `Exception: ${error.message}` });
      }
    });
  } else if (server.type === 'http' || server.type === 'sse') {
    return new Promise((resolve) => {
      try {
        const https = require('https');
        const http = require('http');
        const url = new URL(server.url);
        const client = url.protocol === 'https:' ? https : http;

        const options = {
          method: 'GET',
          headers: {
            ...server.headers
          },
          timeout: 5000
        };

        const req = client.request(server.url, options, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 500) {
            resolve({ success: true, message: `Server is reachable (HTTP ${res.statusCode})` });
          } else {
            resolve({ success: false, error: `Server responded with HTTP ${res.statusCode}` });
          }
          res.resume();
        });

        req.on('error', (err) => {
          resolve({ success: false, error: `Connection failed: ${err.message}` });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, error: 'Connection timeout (5s)' });
        });

        req.end();
      } catch (error) {
        resolve({ success: false, error: `Exception: ${error.message}` });
      }
    });
  } else {
    return { success: false, error: `Unsupported server type: ${server.type}` };
  }
}

module.exports = {
  addMcpServer,
  listMcpServers,
  showMcpServer,
  updateMcpServer,
  removeMcpServer,
  enableMcpServer,
  disableMcpServer,
  showEnabledMcpServers,
  syncMcpConfig,
  testMcpServer
};
