#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const {
  addAccount,
  listAccounts,
  useAccount,
  showInfo,
  removeAccount,
  showCurrent,
  showPaths,
  exportAccount,
  doctor,
  startUI,
  listModelGroups,
  addModelGroup,
  useModelGroup,
  removeModelGroup,
  showModelGroup,
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
} = require('./commands');

// Package info
const packageJson = require('../package.json');

program
  .name('ais')
  .description('AI Account Switch - Manage and switch Claude/Codex/Droids account configurations (AI 账号切换 - 管理和切换 Claude/Codex/Droids 账号配置)')
  .version(packageJson.version);

// Add account command
program
  .command('add [name]')
  .description('Add a new account configuration (添加新账号配置)')
  .action(addAccount);

// List accounts command
program
  .command('list')
  .alias('ls')
  .description('List all available accounts (列出所有可用账号)')
  .action(listAccounts);

// Use account command
program
  .command('use [name-or-id]')
  .description('Set the account to use for the current project by name or ID (通过名称或ID设置当前项目使用的账号)')
  .action(useAccount);

// Show info command
program
  .command('info')
  .description('Show current project\'s account information (显示当前项目的账号信息)')
  .action(showInfo);

// Remove account command
program
  .command('remove [name-or-id]')
  .alias('rm')
  .description('Remove an account by name or ID (通过名称或ID删除账号)')
  .action(removeAccount);

// Show current account command
program
  .command('current')
  .description('Show the current account for this project (显示当前项目的账号)')
  .action(showCurrent);

// Show configuration paths
program
  .command('paths')
  .description('Show configuration file paths (显示配置文件路径)')
  .action(showPaths);

// Export account configuration
program
  .command('export <name-or-id>')
  .description('Export account configuration as JSON by name or ID (通过名称或ID导出账号配置为 JSON)')
  .action(exportAccount);

// Diagnostic command
program
  .command('doctor')
  .description('Diagnose Claude Code configuration issues (诊断 Claude Code 配置问题)')
  .action(doctor);

// Web UI command
program
  .command('ui')
  .description('Start web-based account manager UI (启动基于 Web 的账号管理界面)')
  .action(startUI);

// Model management commands
const modelCommand = program
  .command('model')
  .description('Manage model groups for current project account (管理当前项目账号的模型组)');

modelCommand
  .command('list')
  .alias('ls')
  .description('List all model groups for current account (列出当前账号的所有模型组)')
  .action(listModelGroups);

modelCommand
  .command('add [name]')
  .description('Add a new model group (添加新模型组)')
  .action(addModelGroup);

modelCommand
  .command('use <name>')
  .description('Switch to a different model group (切换到不同的模型组)')
  .action(useModelGroup);

modelCommand
  .command('remove [name]')
  .alias('rm')
  .description('Remove a model group (删除模型组)')
  .action(removeModelGroup);

modelCommand
  .command('show [name]')
  .description('Show model group configuration (显示模型组配置)')
  .action(showModelGroup);

// MCP management commands
const mcpCommand = program
  .command('mcp')
  .description('Manage MCP (Model Context Protocol) servers (管理 MCP 服务器)');

mcpCommand
  .command('add [name]')
  .description('Add a new MCP server (添加新的 MCP 服务器)')
  .action(addMcpServer);

mcpCommand
  .command('list')
  .alias('ls')
  .description('List all MCP servers (列出所有 MCP 服务器)')
  .action(listMcpServers);

mcpCommand
  .command('show [name]')
  .description('Show MCP server details (显示 MCP 服务器详情)')
  .action(showMcpServer);

mcpCommand
  .command('update [name]')
  .description('Update MCP server configuration (更新 MCP 服务器配置)')
  .action(updateMcpServer);

mcpCommand
  .command('remove [name]')
  .alias('rm')
  .description('Remove an MCP server (删除 MCP 服务器)')
  .action(removeMcpServer);

mcpCommand
  .command('enable [name]')
  .description('Activate MCP server for current project (为当前项目激活 MCP 服务器)')
  .action(enableMcpServer);

mcpCommand
  .command('disable [name]')
  .description('Deactivate MCP server for current project (为当前项目停用 MCP 服务器)')
  .action(disableMcpServer);

mcpCommand
  .command('enabled')
  .description('Show active MCP servers for current project (显示当前项目激活的 MCP 服务器)')
  .action(showEnabledMcpServers);

mcpCommand
  .command('sync')
  .description('Sync MCP configuration (bidirectional: import from .mcp.json and export to .mcp.json) (双向同步 MCP 配置)')
  .action(syncMcpConfig);

mcpCommand
  .command('test [name]')
  .description('Test MCP server availability (测试 MCP 服务器可用性)')
  .action(testMcpServer);

// Help command
program
  .command('help')
  .description('Display help information (显示帮助信息)')
  .action(() => {
    console.log(chalk.bold.cyan('\n🤖 AI Account Switch (ais) - Help (帮助)\n'));
    console.log(chalk.bold('USAGE (用法):'));
    console.log('  ais <command> [options]\n');

    console.log(chalk.bold('COMMANDS (命令):'));
    console.log('  add [name]             Add a new account configuration (with custom env vars) (添加新账号配置,支持自定义环境变量)');
    console.log('  list, ls               List all available accounts with IDs (列出所有可用账号及其ID)');
    console.log('  use [name-or-id]       Set the account for current project by name or ID (通过名称或ID设置当前项目使用的账号)');
    console.log('  info                   Show current project\'s account info (显示当前项目的账号信息)');
    console.log('  current                Show current account name (显示当前账号名称)');
    console.log('  remove, rm [name-or-id] Remove an account by name or ID (通过名称或ID删除账号)');
    console.log('  paths                  Show configuration file paths (显示配置文件路径)');
    console.log('  doctor                 Diagnose Claude Code configuration issues (诊断 Claude Code 配置问题)');
    console.log('  export <name-or-id>    Export account as JSON by name or ID (通过名称或ID导出账号为 JSON)');
    console.log('  ui                     Start web-based account manager UI (启动基于 Web 的账号管理界面)');
    console.log('  model                  Manage model groups (管理模型组)');
    console.log('  mcp                    Manage MCP servers (管理 MCP 服务器)');
    console.log('  help                   Display this help message (显示此帮助信息)');
    console.log('  version                Show version number (显示版本号)\n');

    console.log(chalk.bold('EXAMPLES (示例):'));
    console.log(chalk.gray('  # Add a new account interactively (交互式添加新账号)'));
    console.log('  ais add\n');
    console.log(chalk.gray('  # Add a new account with a name (添加带名称的新账号)'));
    console.log('  ais add my-claude-account\n');
    console.log(chalk.gray('  # List all accounts with IDs (列出所有账号及其ID)'));
    console.log('  ais list\n');
    console.log(chalk.gray('  # Use an account by name (通过名称使用账号)'));
    console.log('  ais use my-claude-account\n');
    console.log(chalk.gray('  # Use an account by ID (通过ID使用账号)'));
    console.log('  ais use 1\n');
    console.log(chalk.gray('  # Show current project info (显示当前项目信息)'));
    console.log('  ais info\n');
    console.log(chalk.gray('  # Diagnose configuration issues (诊断配置问题)'));
    console.log('  ais doctor\n');
    console.log(chalk.gray('  # Remove an account by name or ID (通过名称或ID删除账号)'));
    console.log('  ais remove my-old-account');
    console.log('  ais remove 2\n');
    console.log(chalk.gray('  # Start web UI for managing accounts (启动 Web 界面管理账号)'));
    console.log('  ais ui\n');

    console.log(chalk.bold('FEATURES (功能特性):'));
    console.log('  • Custom environment variables support (支持自定义环境变量)');
    console.log('  • Automatic Claude Code .claude/settings.local.json generation (自动生成 Claude Code .claude/settings.local.json)');
    console.log('  • Smart directory detection (works in any subdirectory) (智能目录检测,在任何子目录中都能工作)');
    console.log('  • Configuration diagnostics with doctor command (使用 doctor 命令诊断配置问题)\n');

    console.log(chalk.bold('CONFIGURATION (配置):'));
    console.log('  Global config (全局配置): ~/.ai-account-switch/config.json');
    console.log('  Project config (项目配置): ./.ais-project-config');
    console.log('  Claude config (Claude 配置): ./.claude/settings.local.json\n');

    console.log(chalk.bold('CROSS-PLATFORM (跨平台):'));
    console.log('  Works on macOS, Linux, and Windows (支持 macOS、Linux 和 Windows)');
    console.log('  Account data is stored in your user home directory (账号数据存储在用户主目录中)\n');
  });

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
