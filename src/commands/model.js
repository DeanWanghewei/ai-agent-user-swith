const chalk = require('chalk');
const inquirer = require('inquirer');
const ConfigManager = require('../config');

const config = new ConfigManager();

/**
 * Helper function to prompt for model group configuration
 */
async function promptForModelGroup() {
  console.log(chalk.cyan('\n🤖 Model Group Configuration'));
  console.log(chalk.cyan('Configure which models to use. Leave empty to skip. (配置要使用的模型。留空则跳过。)\n'));

  const modelQuestions = await inquirer.prompt([
    {
      type: 'input',
      name: 'defaultModel',
      message: 'DEFAULT_MODEL (base model, used if others are not set) (基础模型,其他模型未设置时使用):',
      default: ''
    },
    {
      type: 'input',
      name: 'anthropicDefaultOpusModel',
      message: 'ANTHROPIC_DEFAULT_OPUS_MODEL (leave empty to use DEFAULT_MODEL) (留空则使用 DEFAULT_MODEL):',
      default: ''
    },
    {
      type: 'input',
      name: 'anthropicDefaultSonnetModel',
      message: 'ANTHROPIC_DEFAULT_SONNET_MODEL (leave empty to use DEFAULT_MODEL) (留空则使用 DEFAULT_MODEL):',
      default: ''
    },
    {
      type: 'input',
      name: 'anthropicDefaultHaikuModel',
      message: 'ANTHROPIC_DEFAULT_HAIKU_MODEL (leave empty to use DEFAULT_MODEL) (留空则使用 DEFAULT_MODEL):',
      default: ''
    },
    {
      type: 'input',
      name: 'claudeCodeSubagentModel',
      message: 'CLAUDE_CODE_SUBAGENT_MODEL (leave empty to use DEFAULT_MODEL) (留空则使用 DEFAULT_MODEL):',
      default: ''
    },
    {
      type: 'input',
      name: 'anthropicModel',
      message: 'ANTHROPIC_MODEL (leave empty to use DEFAULT_MODEL) (留空则使用 DEFAULT_MODEL):',
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
        message: 'Enter model group name (请输入模型组名称):',
        validate: (input) => input.trim() !== '' || 'Group name is required (模型组名称不能为空)'
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
        message: `Model group '${name}' already exists. Overwrite? (模型组 '${name}' 已存在。是否覆盖?)`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled. (操作已取消。)'));
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
        message: `Set '${name}' as active model group? (将 '${name}' 设为活动模型组?)`,
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
        message: 'Select a model group to remove (请选择要删除的模型组):',
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
      message: `Are you sure you want to remove model group '${name}'? (确定要删除模型组 '${name}' 吗?)`,
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Operation cancelled. (操作已取消。)'));
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
  promptForModelGroup,
  listModelGroups,
  addModelGroup,
  useModelGroup,
  removeModelGroup,
  showModelGroup
};
