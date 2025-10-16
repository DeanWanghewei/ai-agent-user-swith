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
  doctor
} = require('./commands');

// Package info
const packageJson = require('../package.json');

program
  .name('ais')
  .description('AI Account Switch - Manage and switch Claude/Codex account configurations')
  .version(packageJson.version);

// Add account command
program
  .command('add [name]')
  .description('Add a new account configuration')
  .action(addAccount);

// List accounts command
program
  .command('list')
  .alias('ls')
  .description('List all available accounts')
  .action(listAccounts);

// Use account command
program
  .command('use [name]')
  .description('Set the account to use for the current project')
  .action(useAccount);

// Show info command
program
  .command('info')
  .description('Show current project\'s account information')
  .action(showInfo);

// Remove account command
program
  .command('remove [name]')
  .alias('rm')
  .description('Remove an account')
  .action(removeAccount);

// Show current account command
program
  .command('current')
  .description('Show the current account for this project')
  .action(showCurrent);

// Show configuration paths
program
  .command('paths')
  .description('Show configuration file paths')
  .action(showPaths);

// Export account configuration
program
  .command('export <name>')
  .description('Export account configuration as JSON')
  .action(exportAccount);

// Diagnostic command
program
  .command('doctor')
  .description('Diagnose Claude Code configuration issues')
  .action(doctor);

// Help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    console.log(chalk.bold.cyan('\n🤖 AI Account Switch (ais) - Help\n'));
    console.log(chalk.bold('USAGE:'));
    console.log('  ais <command> [options]\n');

    console.log(chalk.bold('COMMANDS:'));
    console.log('  add [name]       Add a new account configuration (with custom env vars)');
    console.log('  list, ls         List all available accounts');
    console.log('  use [name]       Set the account for current project');
    console.log('  info             Show current project\'s account info');
    console.log('  current          Show current account name');
    console.log('  remove, rm       Remove an account');
    console.log('  paths            Show configuration file paths');
    console.log('  doctor           Diagnose Claude Code configuration issues');
    console.log('  export <name>    Export account as JSON');
    console.log('  help             Display this help message');
    console.log('  version          Show version number\n');

    console.log(chalk.bold('EXAMPLES:'));
    console.log(chalk.gray('  # Add a new account interactively'));
    console.log('  ais add\n');
    console.log(chalk.gray('  # Add a new account with a name'));
    console.log('  ais add my-claude-account\n');
    console.log(chalk.gray('  # List all accounts'));
    console.log('  ais list\n');
    console.log(chalk.gray('  # Use an account for current project'));
    console.log('  ais use my-claude-account\n');
    console.log(chalk.gray('  # Show current project info'));
    console.log('  ais info\n');
    console.log(chalk.gray('  # Diagnose configuration issues'));
    console.log('  ais doctor\n');
    console.log(chalk.gray('  # Remove an account'));
    console.log('  ais remove my-old-account\n');

    console.log(chalk.bold('FEATURES:'));
    console.log('  • Custom environment variables support');
    console.log('  • Automatic Claude Code .claude/settings.local.json generation');
    console.log('  • Smart directory detection (works in any subdirectory)');
    console.log('  • Configuration diagnostics with doctor command\n');

    console.log(chalk.bold('CONFIGURATION:'));
    console.log('  Global config: ~/.ai-account-switch/config.json');
    console.log('  Project config: ./.ais-project-config');
    console.log('  Claude config: ./.claude/settings.local.json\n');

    console.log(chalk.bold('CROSS-PLATFORM:'));
    console.log('  Works on macOS, Linux, and Windows');
    console.log('  Account data is stored in your user home directory\n');
  });

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
