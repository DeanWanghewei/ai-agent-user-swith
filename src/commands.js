const chalk = require('chalk');
const inquirer = require('inquirer');
const ConfigManager = require('./config');

const config = new ConfigManager();

/**
 * Add a new account
 */
async function addAccount(name, options) {
  // If name not provided, prompt for it
  if (!name) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'accountName',
        message: 'Enter account name:',
        validate: (input) => input.trim() !== '' || 'Account name is required'
      }
    ]);
    name = answers.accountName;
  }

  // Check if account already exists
  if (config.accountExists(name)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Account '${name}' already exists. Overwrite?`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }
  }

  // Prompt for account details
  const accountData = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Select account type:',
      choices: ['Claude', 'Codex', 'Other'],
      default: 'Claude'
    },
    {
      type: 'input',
      name: 'apiKey',
      message: 'Enter API Key:',
      validate: (input) => input.trim() !== '' || 'API Key is required'
    },
    {
      type: 'input',
      name: 'apiUrl',
      message: 'Enter API URL (optional):',
      default: ''
    },
    {
      type: 'input',
      name: 'email',
      message: 'Enter associated email (optional):',
      default: ''
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter description (optional):',
      default: ''
    },
    {
      type: 'confirm',
      name: 'addCustomEnv',
      message: 'Add custom environment variables? (e.g., CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)',
      default: false
    }
  ]);

  // Handle custom environment variables
  if (accountData.addCustomEnv) {
    accountData.customEnv = {};
    let addMore = true;

    console.log(chalk.cyan('\n💡 Tip: Enter in format KEY=VALUE (e.g., CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1)'));
    console.log(chalk.gray('   Or leave empty to finish\n'));

    while (addMore) {
      const envInput = await inquirer.prompt([
        {
          type: 'input',
          name: 'envVar',
          message: 'Environment variable (KEY=VALUE format):',
          validate: (input) => {
            // Allow empty input to skip
            if (!input.trim()) return true;

            // Check if input contains '='
            if (!input.includes('=')) {
              return 'Invalid format. Use KEY=VALUE format (e.g., MY_VAR=value)';
            }

            const [key, ...valueParts] = input.split('=');
            const value = valueParts.join('='); // In case value contains '='

            if (!key.trim()) {
              return 'Variable name cannot be empty';
            }

            if (!/^[A-Z_][A-Z0-9_]*$/.test(key.trim())) {
              return 'Invalid variable name. Use uppercase letters, numbers, and underscores (e.g., MY_VAR)';
            }

            if (!value.trim()) {
              return 'Variable value cannot be empty';
            }

            return true;
          }
        }
      ]);

      // If user left input empty, skip adding more
      if (!envInput.envVar.trim()) {
        break;
      }

      // Parse KEY=VALUE
      const [key, ...valueParts] = envInput.envVar.split('=');
      const value = valueParts.join('='); // In case value contains '='

      accountData.customEnv[key.trim()] = value.trim();

      // Display currently added variables
      console.log(chalk.green('\n✓ Added:'), chalk.cyan(`${key.trim()}=${value.trim()}`));

      if (Object.keys(accountData.customEnv).length > 0) {
        console.log(chalk.bold('\n📋 Current environment variables:'));
        Object.entries(accountData.customEnv).forEach(([k, v]) => {
          console.log(chalk.gray('   •'), chalk.cyan(`${k}=${v}`));
        });
        console.log('');
      }

      const { continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAdding',
          message: 'Add another environment variable?',
          default: false
        }
      ]);

      addMore = continueAdding;
    }

    if (Object.keys(accountData.customEnv).length > 0) {
      console.log(chalk.green(`\n✓ Total: ${Object.keys(accountData.customEnv).length} custom environment variable(s) added\n`));
    } else {
      console.log(chalk.yellow('\n⚠ No custom environment variables added\n'));
    }
  }

  // Remove the addCustomEnv flag before saving
  delete accountData.addCustomEnv;

  // Initialize model groups structure
  accountData.modelGroups = {};
  accountData.activeModelGroup = null;

  // Prompt for model group configuration
  const { createModelGroup } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createModelGroup',
      message: 'Do you want to create a model group? (Recommended)',
      default: true
    }
  ]);

  if (createModelGroup) {
    const groupName = 'default';
    const modelGroupConfig = await promptForModelGroup();

    if (Object.keys(modelGroupConfig).length > 0) {
      accountData.modelGroups[groupName] = modelGroupConfig;
      accountData.activeModelGroup = groupName;
      console.log(chalk.green(`\n✓ Created model group '${groupName}'`));
    }
  }

  // Save account
  config.addAccount(name, accountData);
  console.log(chalk.green(`✓ Account '${name}' added successfully!`));

  if (accountData.activeModelGroup) {
    console.log(chalk.cyan(`✓ Active model group: ${accountData.activeModelGroup}\n`));
    console.log(chalk.gray('💡 Tip: Use "ais model add" to create more model groups'));
    console.log(chalk.gray('💡 Tip: Use "ais model list" to view all model groups\n'));
  }
}

/**
 * Helper function to prompt for model group configuration
 */
async function promptForModelGroup() {
  console.log(chalk.cyan('\n🤖 Model Group Configuration'));
  console.log(chalk.gray('Configure which models to use. Leave empty to skip.\n'));

  const modelQuestions = await inquirer.prompt([
    {
      type: 'input',
      name: 'defaultModel',
      message: 'DEFAULT_MODEL (base model, used if others are not set):',
      default: ''
    },
    {
      type: 'input',
      name: 'anthropicDefaultOpusModel',
      message: 'ANTHROPIC_DEFAULT_OPUS_MODEL (leave empty to use DEFAULT_MODEL):',
      default: ''
    },
    {
      type: 'input',
      name: 'anthropicDefaultSonnetModel',
      message: 'ANTHROPIC_DEFAULT_SONNET_MODEL (leave empty to use DEFAULT_MODEL):',
      default: ''
    },
    {
      type: 'input',
      name: 'anthropicDefaultHaikuModel',
      message: 'ANTHROPIC_DEFAULT_HAIKU_MODEL (leave empty to use DEFAULT_MODEL):',
      default: ''
    },
    {
      type: 'input',
      name: 'claudeCodeSubagentModel',
      message: 'CLAUDE_CODE_SUBAGENT_MODEL (leave empty to use DEFAULT_MODEL):',
      default: ''
    },
    {
      type: 'input',
      name: 'anthropicModel',
      message: 'ANTHROPIC_MODEL (leave empty to use DEFAULT_MODEL):',
      default: ''
    }
  ]);

  const modelConfig = {};

  // Only add non-empty model configurations
  if (modelQuestions.defaultModel.trim()) {
    modelConfig.DEFAULT_MODEL = modelQuestions.defaultModel.trim();
  }
  if (modelQuestions.anthropicDefaultOpusModel.trim()) {
    modelConfig.ANTHROPIC_DEFAULT_OPUS_MODEL = modelQuestions.anthropicDefaultOpusModel.trim();
  }
  if (modelQuestions.anthropicDefaultSonnetModel.trim()) {
    modelConfig.ANTHROPIC_DEFAULT_SONNET_MODEL = modelQuestions.anthropicDefaultSonnetModel.trim();
  }
  if (modelQuestions.anthropicDefaultHaikuModel.trim()) {
    modelConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL = modelQuestions.anthropicDefaultHaikuModel.trim();
  }
  if (modelQuestions.claudeCodeSubagentModel.trim()) {
    modelConfig.CLAUDE_CODE_SUBAGENT_MODEL = modelQuestions.claudeCodeSubagentModel.trim();
  }
  if (modelQuestions.anthropicModel.trim()) {
    modelConfig.ANTHROPIC_MODEL = modelQuestions.anthropicModel.trim();
  }

  if (Object.keys(modelConfig).length > 0) {
    console.log(chalk.green('\n✓ Model configuration:'));
    Object.entries(modelConfig).forEach(([key, value]) => {
      console.log(chalk.gray('   •'), chalk.cyan(`${key}=${value}`));
    });
    console.log('');
  }

  return modelConfig;
}

/**
 * List all accounts
 */
function listAccounts() {
  const accounts = config.getAllAccounts();
  const accountNames = Object.keys(accounts);

  if (accountNames.length === 0) {
    console.log(chalk.yellow('No accounts found. Use "ais add" to add an account.'));
    return;
  }

  const currentProject = config.getProjectAccount();

  console.log(chalk.bold('\n📋 Available Accounts:\n'));

  accountNames.forEach(name => {
    const account = accounts[name];
    const isActive = currentProject && currentProject.name === name;
    const marker = isActive ? chalk.green('● ') : '  ';
    const nameDisplay = isActive ? chalk.green.bold(name) : chalk.cyan(name);

    console.log(`${marker}${nameDisplay}`);
    console.log(`   Type: ${account.type}`);
    console.log(`   API Key: ${maskApiKey(account.apiKey)}`);
    if (account.email) console.log(`   Email: ${account.email}`);
    if (account.description) console.log(`   Description: ${account.description}`);
    if (account.customEnv && Object.keys(account.customEnv).length > 0) {
      console.log(`   Custom Env: ${Object.keys(account.customEnv).join(', ')}`);
    }
    // Display model groups
    if (account.modelGroups && Object.keys(account.modelGroups).length > 0) {
      const groupNames = Object.keys(account.modelGroups);
      const activeMarker = account.activeModelGroup ? ` (active: ${account.activeModelGroup})` : '';
      console.log(`   Model Groups: ${groupNames.join(', ')}${activeMarker}`);
    }
    console.log(`   Created: ${new Date(account.createdAt).toLocaleString()}`);
    console.log('');
  });

  if (currentProject) {
    console.log(chalk.green(`✓ Current project is using: ${currentProject.name}\n`));
  } else {
    console.log(chalk.yellow('⚠ No account set for current project. Use "ais use <account>" to set one.\n'));
  }
}

/**
 * Switch to a specific account for current project
 */
async function useAccount(name) {
  if (!name) {
    // If no name provided, show interactive selection
    const accounts = config.getAllAccounts();
    const accountNames = Object.keys(accounts);

    if (accountNames.length === 0) {
      console.log(chalk.yellow('No accounts found. Use "ais add" to add an account first.'));
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'accountName',
        message: 'Select an account to use:',
        choices: accountNames
      }
    ]);

    name = answers.accountName;
  }

  if (!config.accountExists(name)) {
    console.log(chalk.red(`✗ Account '${name}' not found.`));
    console.log(chalk.yellow('Use "ais list" to see available accounts.'));
    return;
  }

  const success = config.setProjectAccount(name);
  if (success) {
    const fs = require('fs');
    const path = require('path');

    console.log(chalk.green(`✓ Switched to account '${name}' for current project.`));
    console.log(chalk.yellow(`Project: ${process.cwd()}`));
    console.log(chalk.cyan(`✓ Claude configuration generated at: .claude/settings.local.json`));

    // Check if .gitignore was updated
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const gitDir = path.join(process.cwd(), '.git');
    if (fs.existsSync(gitDir) && fs.existsSync(gitignorePath)) {
      console.log(chalk.cyan(`✓ Updated .gitignore to exclude AIS configuration files`));
    }
  } else {
    console.log(chalk.red('✗ Failed to set account.'));
  }
}

/**
 * Show current project's account info
 */
function showInfo() {
  const projectAccount = config.getProjectAccount();

  if (!projectAccount) {
    console.log(chalk.yellow('⚠ No account set for current project.'));
    console.log(chalk.yellow(`Project: ${process.cwd()}`));
    console.log(chalk.cyan('\nUse "ais use <account>" to set an account for this project.'));
    return;
  }

  console.log(chalk.bold('\n📌 Current Project Account Info:\n'));
  console.log(`${chalk.cyan('Account Name:')} ${chalk.green.bold(projectAccount.name)}`);
  console.log(`${chalk.cyan('Type:')} ${projectAccount.type}`);
  console.log(`${chalk.cyan('API Key:')} ${maskApiKey(projectAccount.apiKey)}`);
  if (projectAccount.apiUrl) console.log(`${chalk.cyan('API URL:')} ${projectAccount.apiUrl}`);
  if (projectAccount.email) console.log(`${chalk.cyan('Email:')} ${projectAccount.email}`);
  if (projectAccount.description) console.log(`${chalk.cyan('Description:')} ${projectAccount.description}`);
  if (projectAccount.customEnv && Object.keys(projectAccount.customEnv).length > 0) {
    console.log(`${chalk.cyan('Custom Environment Variables:')}`);
    Object.entries(projectAccount.customEnv).forEach(([key, value]) => {
      console.log(`  ${chalk.gray('•')} ${key}: ${value}`);
    });
  }
  // Display model groups
  if (projectAccount.modelGroups && Object.keys(projectAccount.modelGroups).length > 0) {
    console.log(`${chalk.cyan('Model Groups:')}`);
    Object.keys(projectAccount.modelGroups).forEach(groupName => {
      const isActive = projectAccount.activeModelGroup === groupName;
      const marker = isActive ? chalk.green('● ') : '  ';
      console.log(`${marker}${isActive ? chalk.green.bold(groupName) : groupName}`);
    });
    if (projectAccount.activeModelGroup) {
      console.log(`${chalk.cyan('Active Model Group:')} ${chalk.green.bold(projectAccount.activeModelGroup)}`);
    }
  }
  console.log(`${chalk.cyan('Set At:')} ${new Date(projectAccount.setAt).toLocaleString()}`);
  console.log(`${chalk.cyan('Project Root:')} ${projectAccount.projectRoot}`);
  console.log(`${chalk.cyan('Current Directory:')} ${process.cwd()}\n`);
}

/**
 * Remove an account
 */
async function removeAccount(name) {
  if (!name) {
    const accounts = config.getAllAccounts();
    const accountNames = Object.keys(accounts);

    if (accountNames.length === 0) {
      console.log(chalk.yellow('No accounts found.'));
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'accountName',
        message: 'Select an account to remove:',
        choices: accountNames
      }
    ]);

    name = answers.accountName;
  }

  if (!config.accountExists(name)) {
    console.log(chalk.red(`✗ Account '${name}' not found.`));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to remove account '${name}'?`,
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Operation cancelled.'));
    return;
  }

  const success = config.removeAccount(name);
  if (success) {
    console.log(chalk.green(`✓ Account '${name}' removed successfully.`));
  } else {
    console.log(chalk.red('✗ Failed to remove account.'));
  }
}

/**
 * Show current account for current project
 */
function showCurrent() {
  const projectAccount = config.getProjectAccount();

  if (!projectAccount) {
    console.log(chalk.yellow('⚠ No account set for current project.'));
    return;
  }

  console.log(chalk.green(`Current account: ${chalk.bold(projectAccount.name)}`));
}

/**
 * Show configuration paths
 */
function showPaths() {
  const paths = config.getConfigPaths();
  const projectRoot = config.findProjectRoot();

  console.log(chalk.bold('\n📂 Configuration Paths:\n'));
  console.log(`${chalk.cyan('Global config file:')} ${paths.global}`);
  console.log(`${chalk.cyan('Global config directory:')} ${paths.globalDir}`);
  console.log(`${chalk.cyan('Project config file:')} ${paths.project}`);

  if (projectRoot) {
    const claudeConfigPath = require('path').join(projectRoot, '.claude', 'settings.local.json');
    const fs = require('fs');
    console.log(`${chalk.cyan('Claude config file:')} ${claudeConfigPath}`);
    console.log(`${chalk.cyan('Claude config exists:')} ${fs.existsSync(claudeConfigPath) ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);
    console.log(`${chalk.cyan('Project root:')} ${projectRoot}`);
    console.log(`${chalk.cyan('Current directory:')} ${process.cwd()}`);
  } else {
    console.log(chalk.yellow('\n⚠ Not in a configured project directory'));
  }
  console.log('');
}

/**
 * Export account configuration
 */
function exportAccount(name) {
  if (!name) {
    console.log(chalk.red('Please specify an account name.'));
    console.log(chalk.cyan('Usage: ais export <account-name>'));
    return;
  }

  const account = config.getAccount(name);
  if (!account) {
    console.log(chalk.red(`✗ Account '${name}' not found.`));
    return;
  }

  console.log(chalk.bold(`\n📤 Export for account '${name}':\n`));
  console.log(JSON.stringify({ [name]: account }, null, 2));
  console.log('');
}

/**
 * Utility function to mask API key
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '****';
  return apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4);
}

/**
 * Diagnose Claude Code configuration issues
 */
function doctor() {
  const path = require('path');
  const fs = require('fs');
  const os = require('os');

  console.log(chalk.bold.cyan('\n🔍 Claude Code Configuration Diagnostics\n'));

  // Check current directory
  console.log(chalk.bold('1. Current Directory:'));
  console.log(`   ${process.cwd()}\n`);

  // Check project root
  const projectRoot = config.findProjectRoot();
  console.log(chalk.bold('2. Project Root Detection:'));
  if (projectRoot) {
    console.log(chalk.green(`   ✓ Found project root: ${projectRoot}`));
  } else {
    console.log(chalk.yellow('   ⚠ No project root found (not in a configured project)'));
    console.log(chalk.gray('   Run "ais use <account>" in your project root first\n'));
    return;
  }

  // Check ais project config
  const aisConfigPath = path.join(projectRoot, '.ais-project-config');
  console.log(chalk.bold('\n3. AIS Project Configuration:'));
  if (fs.existsSync(aisConfigPath)) {
    console.log(chalk.green(`   ✓ Config exists: ${aisConfigPath}`));
    try {
      const aisConfig = JSON.parse(fs.readFileSync(aisConfigPath, 'utf8'));
      console.log(`   Account: ${chalk.cyan(aisConfig.activeAccount)}`);
    } catch (e) {
      console.log(chalk.red(`   ✗ Error reading config: ${e.message}`));
    }
  } else {
    console.log(chalk.red(`   ✗ Config not found: ${aisConfigPath}`));
  }

  // Check Claude config
  const claudeDir = path.join(projectRoot, '.claude');
  const claudeConfigPath = path.join(claudeDir, 'settings.local.json');

  console.log(chalk.bold('\n4. Claude Code Configuration:'));
  console.log(`   Expected location: ${claudeConfigPath}`);

  if (fs.existsSync(claudeConfigPath)) {
    console.log(chalk.green('   ✓ Claude config exists'));
    try {
      const claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));

      if (claudeConfig.env && claudeConfig.env.ANTHROPIC_AUTH_TOKEN) {
        const token = claudeConfig.env.ANTHROPIC_AUTH_TOKEN;
        const masked = token.substring(0, 6) + '****' + token.substring(token.length - 4);
        console.log(`   API Token: ${masked}`);
      }

      if (claudeConfig.env && claudeConfig.env.ANTHROPIC_BASE_URL) {
        console.log(`   API URL: ${claudeConfig.env.ANTHROPIC_BASE_URL}`);
      }
    } catch (e) {
      console.log(chalk.red(`   ✗ Error reading Claude config: ${e.message}`));
    }
  } else {
    console.log(chalk.red('   ✗ Claude config not found'));
    console.log(chalk.yellow('   Run "ais use <account>" to generate it'));
  }

  // Check global Claude config
  const globalClaudeConfig = path.join(os.homedir(), '.claude', 'settings.json');
  console.log(chalk.bold('\n5. Global Claude Configuration:'));
  console.log(`   Location: ${globalClaudeConfig}`);

  if (fs.existsSync(globalClaudeConfig)) {
    console.log(chalk.yellow('   ⚠ Global config exists (may override project config in some cases)'));
    try {
      const globalConfig = JSON.parse(fs.readFileSync(globalClaudeConfig, 'utf8'));
      if (globalConfig.env && globalConfig.env.ANTHROPIC_AUTH_TOKEN) {
        const token = globalConfig.env.ANTHROPIC_AUTH_TOKEN;
        const masked = token.substring(0, 6) + '****' + token.substring(token.length - 4);
        console.log(`   Global API Token: ${masked}`);
      }
      if (globalConfig.env && globalConfig.env.ANTHROPIC_BASE_URL) {
        console.log(`   Global API URL: ${globalConfig.env.ANTHROPIC_BASE_URL}`);
      }
    } catch (e) {
      console.log(chalk.red(`   ✗ Error reading global config: ${e.message}`));
    }
  } else {
    console.log(chalk.green('   ✓ No global config (good - project config will be used)'));
  }

  // Recommendations
  console.log(chalk.bold('\n6. Recommendations:'));

  if (projectRoot && process.cwd() !== projectRoot) {
    console.log(chalk.yellow(`   ⚠ You are in a subdirectory (${path.relative(projectRoot, process.cwd())})`));
    console.log(chalk.cyan('   • Claude Code should still find the project config'));
    console.log(chalk.cyan('   • Make sure to start Claude Code from this directory or parent directories'));
  }

  if (fs.existsSync(globalClaudeConfig)) {
    console.log(chalk.yellow('   ⚠ Global Claude config exists:'));
    console.log(chalk.cyan('   • Project config should take precedence'));
    console.log(chalk.cyan('   • If issues persist, consider removing global env settings'));
    console.log(chalk.gray(`   • File: ${globalClaudeConfig}`));
  }

  console.log(chalk.bold('\n7. Next Steps:'));
  console.log(chalk.cyan('   • Start Claude Code from your project directory or subdirectory'));
  console.log(chalk.cyan('   • Check which account Claude Code is using'));
  console.log(chalk.cyan('   • If wrong account is used, run: ais use <correct-account>'));
  console.log('');
}

/**
 * Start Web UI server
 */
function startUI() {
  const UIServer = require('./ui-server');
  const server = new UIServer();

  console.log(chalk.cyan('\n🌐 Starting AIS Web UI...\n'));
  server.start();
}

/**
 * List all model groups for current account
 */
function listModelGroups() {
  const projectAccount = config.getProjectAccount();

  if (!projectAccount) {
    console.log(chalk.yellow('⚠ No account set for current project.'));
    console.log(chalk.cyan('Use "ais use <account>" to set an account first.\n'));
    return;
  }

  if (!projectAccount.modelGroups || Object.keys(projectAccount.modelGroups).length === 0) {
    console.log(chalk.yellow(`⚠ No model groups configured for account '${projectAccount.name}'.`));
    console.log(chalk.cyan('Use "ais model add" to create a model group.\n'));
    return;
  }

  console.log(chalk.bold(`\n📋 Model Groups for '${projectAccount.name}':\n`));

  Object.entries(projectAccount.modelGroups).forEach(([groupName, groupConfig]) => {
    const isActive = projectAccount.activeModelGroup === groupName;
    const marker = isActive ? chalk.green('● ') : '  ';
    const nameDisplay = isActive ? chalk.green.bold(groupName) : chalk.cyan(groupName);

    console.log(`${marker}${nameDisplay}`);
    if (Object.keys(groupConfig).length > 0) {
      Object.entries(groupConfig).forEach(([key, value]) => {
        console.log(`   ${chalk.cyan(key + ':')} ${value}`);
      });
    } else {
      console.log(`   ${chalk.gray('(empty configuration)')}`);
    }
    console.log('');
  });

  if (projectAccount.activeModelGroup) {
    console.log(chalk.green(`✓ Active model group: ${projectAccount.activeModelGroup}\n`));
  }
}

/**
 * Add a new model group
 */
async function addModelGroup(name) {
  const projectAccount = config.getProjectAccount();

  if (!projectAccount) {
    console.log(chalk.yellow('⚠ No account set for current project.'));
    console.log(chalk.cyan('Use "ais use <account>" to set an account first.\n'));
    return;
  }

  // Prompt for group name if not provided
  if (!name) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'groupName',
        message: 'Enter model group name:',
        validate: (input) => input.trim() !== '' || 'Group name is required'
      }
    ]);
    name = answers.groupName;
  }

  // Check if group already exists
  if (projectAccount.modelGroups && projectAccount.modelGroups[name]) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Model group '${name}' already exists. Overwrite?`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }
  }

  // Prompt for model configuration
  const modelGroupConfig = await promptForModelGroup();

  if (Object.keys(modelGroupConfig).length === 0) {
    console.log(chalk.yellow('⚠ No configuration provided. Model group not created.'));
    return;
  }

  // Add the model group to the account
  const account = config.getAccount(projectAccount.name);
  if (!account.modelGroups) {
    account.modelGroups = {};
  }
  account.modelGroups[name] = modelGroupConfig;

  // Set as active if it's the first group
  if (!account.activeModelGroup) {
    account.activeModelGroup = name;
  }

  config.addAccount(projectAccount.name, account);
  console.log(chalk.green(`✓ Model group '${name}' added successfully!`));

  // Ask if user wants to activate this group
  if (account.activeModelGroup !== name) {
    const { activate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'activate',
        message: `Set '${name}' as active model group?`,
        default: false
      }
    ]);

    if (activate) {
      account.activeModelGroup = name;
      config.addAccount(projectAccount.name, account);

      // Regenerate Claude config with new active group
      config.setProjectAccount(projectAccount.name);
      console.log(chalk.green(`✓ Switched to model group '${name}' and updated Claude configuration.`));
    }
  } else {
    // Regenerate Claude config
    config.setProjectAccount(projectAccount.name);
    console.log(chalk.green(`✓ Updated Claude configuration with active group '${name}'.`));
  }
}

/**
 * Switch to a different model group
 */
async function useModelGroup(name) {
  const projectAccount = config.getProjectAccount();

  if (!projectAccount) {
    console.log(chalk.yellow('⚠ No account set for current project.'));
    console.log(chalk.cyan('Use "ais use <account>" to set an account first.\n'));
    return;
  }

  if (!projectAccount.modelGroups || Object.keys(projectAccount.modelGroups).length === 0) {
    console.log(chalk.yellow(`⚠ No model groups configured for account '${projectAccount.name}'.`));
    console.log(chalk.cyan('Use "ais model add" to create a model group first.\n'));
    return;
  }

  if (!projectAccount.modelGroups[name]) {
    console.log(chalk.red(`✗ Model group '${name}' not found.`));
    console.log(chalk.yellow('Available groups:'), Object.keys(projectAccount.modelGroups).join(', '));
    return;
  }

  // Update active model group
  const account = config.getAccount(projectAccount.name);
  account.activeModelGroup = name;
  config.addAccount(projectAccount.name, account);

  // Regenerate Claude config with new active group
  config.setProjectAccount(projectAccount.name);

  console.log(chalk.green(`✓ Switched to model group '${name}'.`));
  console.log(chalk.cyan('✓ Claude configuration updated.\n'));
}

/**
 * Remove a model group
 */
async function removeModelGroup(name) {
  const projectAccount = config.getProjectAccount();

  if (!projectAccount) {
    console.log(chalk.yellow('⚠ No account set for current project.'));
    console.log(chalk.cyan('Use "ais use <account>" to set an account first.\n'));
    return;
  }

  if (!projectAccount.modelGroups || Object.keys(projectAccount.modelGroups).length === 0) {
    console.log(chalk.yellow(`⚠ No model groups configured for account '${projectAccount.name}'.`));
    return;
  }

  // Prompt for group name if not provided
  if (!name) {
    const groupNames = Object.keys(projectAccount.modelGroups);
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'groupName',
        message: 'Select a model group to remove:',
        choices: groupNames
      }
    ]);
    name = answers.groupName;
  }

  if (!projectAccount.modelGroups[name]) {
    console.log(chalk.red(`✗ Model group '${name}' not found.`));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to remove model group '${name}'?`,
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Operation cancelled.'));
    return;
  }

  // Remove the model group
  const account = config.getAccount(projectAccount.name);
  delete account.modelGroups[name];

  // Update active group if needed
  if (account.activeModelGroup === name) {
    const remainingGroups = Object.keys(account.modelGroups);
    account.activeModelGroup = remainingGroups.length > 0 ? remainingGroups[0] : null;

    if (account.activeModelGroup) {
      console.log(chalk.cyan(`✓ Switched active group to '${account.activeModelGroup}'.`));
    } else {
      console.log(chalk.yellow('⚠ No model groups remaining.'));
    }
  }

  config.addAccount(projectAccount.name, account);

  // Regenerate Claude config
  config.setProjectAccount(projectAccount.name);

  console.log(chalk.green(`✓ Model group '${name}' removed successfully.`));
}

/**
 * Show model group configuration
 */
function showModelGroup(name) {
  const projectAccount = config.getProjectAccount();

  if (!projectAccount) {
    console.log(chalk.yellow('⚠ No account set for current project.'));
    console.log(chalk.cyan('Use "ais use <account>" to set an account first.\n'));
    return;
  }

  if (!projectAccount.modelGroups || Object.keys(projectAccount.modelGroups).length === 0) {
    console.log(chalk.yellow(`⚠ No model groups configured for account '${projectAccount.name}'.`));
    return;
  }

  // Show active group if no name provided
  if (!name) {
    if (!projectAccount.activeModelGroup) {
      console.log(chalk.yellow('⚠ No active model group.'));
      return;
    }
    name = projectAccount.activeModelGroup;
  }

  if (!projectAccount.modelGroups[name]) {
    console.log(chalk.red(`✗ Model group '${name}' not found.`));
    console.log(chalk.yellow('Available groups:'), Object.keys(projectAccount.modelGroups).join(', '));
    return;
  }

  const isActive = projectAccount.activeModelGroup === name;
  const activeMarker = isActive ? chalk.green(' (active)') : '';

  console.log(chalk.bold(`\n📋 Model Group: ${chalk.cyan(name)}${activeMarker}\n`));

  const groupConfig = projectAccount.modelGroups[name];
  if (Object.keys(groupConfig).length === 0) {
    console.log(chalk.gray('  (empty configuration)\n'));
  } else {
    Object.entries(groupConfig).forEach(([key, value]) => {
      console.log(`  ${chalk.cyan(key)}: ${value}`);
    });
    console.log('');
  }
}

module.exports = {
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
};
