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
  showModelGroup
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
  .command('use [name]')
  .description('Set the account to use for the current project (设置当前项目使用的账号)')
  .action(useAccount);

// Show info command
program
  .command('info')
  .description('Show current project\'s account information (显示当前项目的账号信息)')
  .action(showInfo);

// Remove account command
program
  .command('remove [name]')
  .alias('rm')
  .description('Remove an account (删除账号)')
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
  .command('export <name>')
  .description('Export account configuration as JSON (导出账号配置为 JSON)')
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

// Help command
program
  .command('help')
  .description('Display help information (显示帮助信息)')
  .action(() => {
    console.log(chalk.bold.cyan('\n🤖 AI Account Switch (ais) - Help (帮助)\n'));
    console.log(chalk.bold('USAGE (用法):'));
    console.log('  ais <command> [options]\n');

    console.log(chalk.bold('COMMANDS (命令):'));
    console.log('  add [name]       Add a new account configuration (with custom env vars) (添加新账号配置,支持自定义环境变量)');
    console.log('  list, ls         List all available accounts (列出所有可用账号)');
    console.log('  use [name]       Set the account for current project (设置当前项目使用的账号)');
    console.log('  info             Show current project\'s account info (显示当前项目的账号信息)');
    console.log('  current          Show current account name (显示当前账号名称)');
    console.log('  remove, rm       Remove an account (删除账号)');
    console.log('  paths            Show configuration file paths (显示配置文件路径)');
    console.log('  doctor           Diagnose Claude Code configuration issues (诊断 Claude Code 配置问题)');
    console.log('  export <name>    Export account as JSON (导出账号为 JSON)');
    console.log('  ui               Start web-based account manager UI (启动基于 Web 的账号管理界面)');
    console.log('  help             Display this help message (显示此帮助信息)');
    console.log('  version          Show version number (显示版本号)\n');

    console.log(chalk.bold('EXAMPLES (示例):'));
    console.log(chalk.gray('  # Add a new account interactively (交互式添加新账号)'));
    console.log('  ais add\n');
    console.log(chalk.gray('  # Add a new account with a name (添加带名称的新账号)'));
    console.log('  ais add my-claude-account\n');
    console.log(chalk.gray('  # List all accounts (列出所有账号)'));
    console.log('  ais list\n');
    console.log(chalk.gray('  # Use an account for current project (为当前项目使用某个账号)'));
    console.log('  ais use my-claude-account\n');
    console.log(chalk.gray('  # Show current project info (显示当前项目信息)'));
    console.log('  ais info\n');
    console.log(chalk.gray('  # Diagnose configuration issues (诊断配置问题)'));
    console.log('  ais doctor\n');
    console.log(chalk.gray('  # Remove an account (删除账号)'));
    console.log('  ais remove my-old-account\n');
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
