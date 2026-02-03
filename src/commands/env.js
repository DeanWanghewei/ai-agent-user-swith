const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ConfigManager = require('../config');
const { maskEnvValue } = require('./helpers');

const config = new ConfigManager();

/**
 * Get Claude user config path (using ConfigManager's method for consistency)
 */
function getClaudeUserConfigPath() {
  const claudeConfigPath = config.getClaudeUserConfigPath();

  // If config exists, return it; otherwise, use default path
  if (claudeConfigPath) {
    return claudeConfigPath;
  }

  // Fallback to default location
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return null;

  return path.join(home, '.claude', 'settings.json');
}

/**
 * Read Claude project config (.claude/settings.local.json)
 */
function readClaudeProjectConfig(projectRoot = process.cwd()) {
  const claudeConfigFile = path.join(projectRoot, '.claude', 'settings.local.json');

  if (!fs.existsSync(claudeConfigFile)) {
    return { env: {} };
  }

  try {
    const data = fs.readFileSync(claudeConfigFile, 'utf8');
    const config = JSON.parse(data);
    // Ensure env property exists
    if (!config.env) {
      config.env = {};
    }
    return config;
  } catch (error) {
    return { env: {} };
  }
}

/**
 * Write Claude project config
 */
function writeClaudeProjectConfig(claudeConfig, projectRoot = process.cwd()) {
  const claudeDir = path.join(projectRoot, '.claude');
  const claudeConfigFile = path.join(claudeDir, 'settings.local.json');

  // Create .claude directory if it doesn't exist
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Read existing config and merge with new env
  let existingConfig = {};
  if (fs.existsSync(claudeConfigFile)) {
    try {
      const data = fs.readFileSync(claudeConfigFile, 'utf8');
      existingConfig = JSON.parse(data);
    } catch (error) {
      // If parsing fails, start fresh
    }
  }

  // Merge env property
  existingConfig.env = claudeConfig.env || {};

  fs.writeFileSync(claudeConfigFile, JSON.stringify(existingConfig, null, 2), 'utf8');
}

/**
 * Read Claude user config (~/.claude.json or ~/.config/claude/config.json)
 */
function readClaudeUserConfig() {
  const claudeConfigPath = getClaudeUserConfigPath();

  if (!claudeConfigPath || !fs.existsSync(claudeConfigPath)) {
    return { env: {} };
  }

  try {
    const data = fs.readFileSync(claudeConfigPath, 'utf8');
    const config = JSON.parse(data);
    // Ensure env property exists
    if (!config.env) {
      config.env = {};
    }
    return config;
  } catch (error) {
    return { env: {} };
  }
}

/**
 * Write Claude user config
 */
function writeClaudeUserConfig(claudeConfig) {
  const claudeConfigPath = getClaudeUserConfigPath();

  if (!claudeConfigPath) {
    throw new Error('Could not determine Claude config path');
  }

  // Create directory if it doesn't exist
  const claudeConfigDir = path.dirname(claudeConfigPath);
  if (!fs.existsSync(claudeConfigDir)) {
    fs.mkdirSync(claudeConfigDir, { recursive: true });
  }

  // Read existing config and merge with new env
  let existingConfig = {};
  if (fs.existsSync(claudeConfigPath)) {
    try {
      const data = fs.readFileSync(claudeConfigPath, 'utf8');
      existingConfig = JSON.parse(data);
    } catch (error) {
      // If parsing fails, start fresh
    }
  }

  // Merge env property
  existingConfig.env = claudeConfig.env || {};

  fs.writeFileSync(claudeConfigPath, JSON.stringify(existingConfig, null, 2), 'utf8');
}

/**
 * List environment variables from both project and user configs
 */
async function listEnv() {
  try {
    const projectRoot = config.findProjectRoot();
    const projectConfig = projectRoot ? readClaudeProjectConfig(projectRoot) : null;
    const userConfig = readClaudeUserConfig();

    console.log(chalk.bold.cyan('\n📋 Environment Variables (环境变量)\n'));

    // Project-level environment variables
    if (projectRoot) {
      console.log(chalk.bold('Project Level (项目级别):'));
      console.log(`  ${chalk.cyan('Path:')} ${projectRoot}`);
      console.log(`  ${chalk.cyan('Config:')} ${path.join(projectRoot, '.claude', 'settings.local.json')}\n`);

      const projectEnv = projectConfig.env || {};
      if (Object.keys(projectEnv).length > 0) {
        console.log(chalk.bold('  Variables (变量):'));
        Object.entries(projectEnv).forEach(([key, value]) => {
          const maskedValue = maskEnvValue(key, value);
          console.log(`    ${chalk.cyan(key)} = ${chalk.yellow(maskedValue)}`);
        });
      } else {
        console.log(chalk.yellow('  No environment variables configured (未配置环境变量)'));
      }
      console.log('');
    } else {
      console.log(chalk.yellow('Not in a project directory (未在项目目录中)\n'));
    }

    // User-level environment variables
    console.log(chalk.bold('User Level (用户级别):'));
    const claudeConfigPath = getClaudeUserConfigPath();
    console.log(`  ${chalk.cyan('Config:')} ${claudeConfigPath}\n`);

    const userEnv = userConfig.env || {};
    if (Object.keys(userEnv).length > 0) {
      console.log(chalk.bold('  Variables (变量):'));
      Object.entries(userEnv).forEach(([key, value]) => {
        const maskedValue = maskEnvValue(key, value);
        console.log(`    ${chalk.cyan(key)} = ${chalk.yellow(maskedValue)}`);
      });
    } else {
      console.log(chalk.yellow('  No environment variables configured (未配置环境变量)'));
    }
    console.log('');
  } catch (error) {
    console.error(chalk.red('✗ Error listing environment variables:'), error.message);
  }
}

/**
 * Add or update environment variable
 */
async function addEnv() {
  try {
    const projectRoot = config.findProjectRoot();

    const { level } = await inquirer.prompt([
      {
        type: 'list',
        name: 'level',
        message: 'Select configuration level (请选择配置级别):',
        choices: projectRoot
          ? [
              { name: 'Project (项目) - Only for current project (仅当前项目)', value: 'project' },
              { name: 'User (用户) - For all projects (所有项目)', value: 'user' }
            ]
          : [
              { name: 'User (用户) - For all projects (所有项目)', value: 'user' }
            ]
      }
    ]);

    let existingEnv;
    let configPath;
    let isUserLevel = level === 'user';

    if (isUserLevel) {
      const userConfig = readClaudeUserConfig();
      existingEnv = userConfig.env || {};
      configPath = getClaudeUserConfigPath();
    } else {
      const projectConfig = readClaudeProjectConfig(projectRoot);
      existingEnv = projectConfig.env || {};
      configPath = path.join(projectRoot, '.claude', 'settings.local.json');
    }

    // Show existing variables
    if (Object.keys(existingEnv).length > 0) {
      console.log(chalk.cyan('\n📋 Existing environment variables (现有环境变量):\n'));
      Object.entries(existingEnv).forEach(([key, value]) => {
        const maskedValue = maskEnvValue(key, value);
        console.log(`  ${chalk.gray('•')} ${chalk.cyan(key)} = ${chalk.yellow(maskedValue)}`);
      });
      console.log('');
    }

    const { key, value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'key',
        message: 'Enter environment variable name (请输入环境变量名称):',
        validate: (input) => {
          if (!input.trim()) {
            return 'Environment variable name is required (环境变量名称不能为空)';
          }
          if (!/^[A-Z_][A-Z0-9_]*$/.test(input.trim())) {
            return 'Invalid variable name. Use uppercase letters, numbers, and underscores (e.g., MY_VAR) (变量名无效。请使用大写字母、数字和下划线,例如: MY_VAR)';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'value',
        message: 'Enter environment variable value (请输入环境变量值):',
        validate: (input) => input.trim() !== '' || 'Environment variable value is required (环境变量值不能为空)'
      }
    ]);

    const envKey = key.trim();
    const envValue = value.trim();

    // Check if variable already exists
    if (existingEnv[envKey]) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Variable '${envKey}' already exists with value '${existingEnv[envKey]}'. Overwrite? (变量 '${envKey}' 已存在,值为 '${existingEnv[envKey]}'。是否覆盖?)`,
          default: false
        }
      ]);

      if (!overwrite) {
        console.log(chalk.yellow('Operation cancelled. (操作已取消。)'));
        return;
      }
    }

    // Update the config
    if (isUserLevel) {
      const userConfig = readClaudeUserConfig();
      userConfig.env = userConfig.env || {};
      userConfig.env[envKey] = envValue;
      writeClaudeUserConfig(userConfig);
    } else {
      const projectConfig = readClaudeProjectConfig(projectRoot);
      projectConfig.env = projectConfig.env || {};
      projectConfig.env[envKey] = envValue;
      writeClaudeProjectConfig(projectConfig, projectRoot);
    }

    console.log(chalk.green(`\n✓ Environment variable '${envKey}' added successfully at ${level} level! (环境变量 '${envKey}' 在${level === 'project' ? '项目' : '用户'}级别添加成功!)`));
    console.log(`  ${chalk.cyan('Config file (配置文件):')} ${configPath}\n`);
  } catch (error) {
    console.error(chalk.red('✗ Error adding environment variable:'), error.message);
  }
}

/**
 * Set environment variable (non-interactive, for scripts)
 */
async function setEnv(key, value, options = {}) {
  try {
    const level = options.level || 'user';
    const isUserLevel = level === 'user';

    if (!key || !value) {
      console.log(chalk.red('✗ Key and value are required (键和值都是必需的)'));
      console.log(chalk.cyan('Usage: ais env set <key> <value> [--level=project|user]'));
      return;
    }

    // Validate key format
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      console.log(chalk.red(`✗ Invalid variable name '${key}'. Use uppercase letters, numbers, and underscores (e.g., MY_VAR)`));
      return;
    }

    let configPath;

    if (isUserLevel) {
      const userConfig = readClaudeUserConfig();
      userConfig.env = userConfig.env || {};
      userConfig.env[key] = value;
      writeClaudeUserConfig(userConfig);
      configPath = getClaudeUserConfigPath();
    } else {
      const projectRoot = config.findProjectRoot();
      if (!projectRoot) {
        console.log(chalk.red('✗ Not in a project directory. Use --level=user or run from a project directory'));
        return;
      }
      const projectConfig = readClaudeProjectConfig(projectRoot);
      projectConfig.env = projectConfig.env || {};
      projectConfig.env[key] = value;
      writeClaudeProjectConfig(projectConfig, projectRoot);
      configPath = path.join(projectRoot, '.claude', 'settings.local.json');
    }

    console.log(chalk.green(`✓ Environment variable '${key}' set successfully at ${level} level!`));
    console.log(`  ${chalk.cyan('Config file:')} ${configPath}`);
  } catch (error) {
    console.error(chalk.red('✗ Error setting environment variable:'), error.message);
  }
}

/**
 * Remove environment variable
 */
async function removeEnv() {
  try {
    const projectRoot = config.findProjectRoot();

    const { level } = await inquirer.prompt([
      {
        type: 'list',
        name: 'level',
        message: 'Select configuration level (请选择配置级别):',
        choices: projectRoot
          ? [
              { name: 'Project (项目) - Only for current project (仅当前项目)', value: 'project' },
              { name: 'User (用户) - For all projects (所有项目)', value: 'user' }
            ]
          : [
              { name: 'User (用户) - For all projects (所有项目)', value: 'user' }
            ]
      }
    ]);

    let existingEnv;
    let isUserLevel = level === 'user';

    if (isUserLevel) {
      const userConfig = readClaudeUserConfig();
      existingEnv = userConfig.env || {};
    } else {
      const projectConfig = readClaudeProjectConfig(projectRoot);
      existingEnv = projectConfig.env || {};
    }

    if (Object.keys(existingEnv).length === 0) {
      console.log(chalk.yellow(`No environment variables configured at ${level} level (${level === 'project' ? '项目' : '用户'}级别未配置环境变量)`));
      return;
    }

    const { key } = await inquirer.prompt([
      {
        type: 'list',
        name: 'key',
        message: 'Select environment variable to remove (请选择要删除的环境变量):',
        choices: Object.keys(existingEnv)
      }
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Remove environment variable '${key}'? (确定要删除环境变量 '${key}' 吗?)`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Operation cancelled. (操作已取消。)'));
      return;
    }

    // Remove the variable
    if (isUserLevel) {
      const userConfig = readClaudeUserConfig();
      delete userConfig.env[key];
      writeClaudeUserConfig(userConfig);
    } else {
      const projectConfig = readClaudeProjectConfig(projectRoot);
      delete projectConfig.env[key];
      writeClaudeProjectConfig(projectConfig, projectRoot);
    }

    console.log(chalk.green(`✓ Environment variable '${key}' removed successfully from ${level} level! (环境变量 '${key}' 从${level === 'project' ? '项目' : '用户'}级别删除成功!)\n`));
  } catch (error) {
    console.error(chalk.red('✗ Error removing environment variable:'), error.message);
  }
}

/**
 * Remove environment variable by key (non-interactive)
 */
async function unsetEnv(key, options = {}) {
  try {
    const level = options.level || 'user';
    const isUserLevel = level === 'user';

    if (!key) {
      console.log(chalk.red('✗ Key is required (键是必需的)'));
      console.log(chalk.cyan('Usage: ais env unset <key> [--level=project|user]'));
      return;
    }

    let configPath;

    if (isUserLevel) {
      const userConfig = readClaudeUserConfig();
      if (!userConfig.env || !userConfig.env[key]) {
        console.log(chalk.yellow(`Environment variable '${key}' not found at user level`));
        return;
      }
      delete userConfig.env[key];
      writeClaudeUserConfig(userConfig);
      configPath = getClaudeUserConfigPath();
    } else {
      const projectRoot = config.findProjectRoot();
      if (!projectRoot) {
        console.log(chalk.red('✗ Not in a project directory. Use --level=user or run from a project directory'));
        return;
      }
      const projectConfig = readClaudeProjectConfig(projectRoot);
      if (!projectConfig.env || !projectConfig.env[key]) {
        console.log(chalk.yellow(`Environment variable '${key}' not found at project level`));
        return;
      }
      delete projectConfig.env[key];
      writeClaudeProjectConfig(projectConfig, projectRoot);
      configPath = path.join(projectRoot, '.claude', 'settings.local.json');
    }

    console.log(chalk.green(`✓ Environment variable '${key}' removed successfully from ${level} level!`));
    console.log(`  ${chalk.cyan('Config file:')} ${configPath}`);
  } catch (error) {
    console.error(chalk.red('✗ Error unsetting environment variable:'), error.message);
  }
}

/**
 * Show environment variable value
 */
async function showEnv(key, options = {}) {
  try {
    const level = options.level;
    const projectRoot = config.findProjectRoot();

    let found = false;
    let foundLevel = '';

    // Search in project config first if not specified or if project level requested
    if (!level || level === 'project') {
      if (projectRoot) {
        const projectConfig = readClaudeProjectConfig(projectRoot);
        if (projectConfig.env && projectConfig.env[key]) {
          console.log(chalk.cyan(`\n📋 Environment Variable: ${key}`));
          console.log(`${chalk.cyan('Level:')} Project (项目)`);
          console.log(`${chalk.cyan('Value:')} ${maskEnvValue(key, projectConfig.env[key])}`);
          console.log(`${chalk.cyan('Config:')} ${path.join(projectRoot, '.claude', 'settings.local.json')}`);
          console.log('');
          found = true;
          foundLevel = 'project';
        }
      }
    }

    // Search in user config if not found in project or if user level requested
    if (!found && (!level || level === 'user')) {
      const userConfig = readClaudeUserConfig();
      if (userConfig.env && userConfig.env[key]) {
        console.log(chalk.cyan(`\n📋 Environment Variable: ${key}`));
        console.log(`${chalk.cyan('Level:')} User (用户)`);
        console.log(`${chalk.cyan('Value:')} ${maskEnvValue(key, userConfig.env[key])}`);
        console.log(`${chalk.cyan('Config:')} ${getClaudeUserConfigPath()}`);
        console.log('');
        found = true;
        foundLevel = 'user';
      }
    }

    if (!found) {
      console.log(chalk.yellow(`Environment variable '${key}' not found`));
      if (level) {
        console.log(`  ${chalk.cyan('Level:')} ${level}`);
      }
    }
  } catch (error) {
    console.error(chalk.red('✗ Error showing environment variable:'), error.message);
  }
}

/**
 * Clear all environment variables at a level
 */
async function clearEnv(options = {}) {
  try {
    const level = options.level || 'user';
    const isUserLevel = level === 'user';

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Clear all environment variables at ${level} level? This cannot be undone. (确定要清空${level === 'project' ? '项目' : '用户'}级别的所有环境变量吗? 此操作无法撤销。)`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Operation cancelled. (操作已取消。)'));
      return;
    }

    if (isUserLevel) {
      const userConfig = readClaudeUserConfig();
      userConfig.env = {};
      writeClaudeUserConfig(userConfig);
      console.log(chalk.green('✓ All user-level environment variables cleared successfully! (所有用户级别的环境变量已清空!)'));
    } else {
      const projectRoot = config.findProjectRoot();
      if (!projectRoot) {
        console.log(chalk.red('✗ Not in a project directory'));
        return;
      }
      const projectConfig = readClaudeProjectConfig(projectRoot);
      projectConfig.env = {};
      writeClaudeProjectConfig(projectConfig, projectRoot);
      console.log(chalk.green('✓ All project-level environment variables cleared successfully! (所有项目级别的环境变量已清空!)'));
    }
    console.log('');
  } catch (error) {
    console.error(chalk.red('✗ Error clearing environment variables:'), error.message);
  }
}

/**
 * Edit environment variables interactively
 */
async function editEnv(options = {}) {
  try {
    const level = options.level || 'user';
    const projectRoot = config.findProjectRoot();

    if (level === 'project' && !projectRoot) {
      console.log(chalk.red('✗ Not in a project directory'));
      return;
    }

    let envVars;
    let isUserLevel = level === 'user';

    if (isUserLevel) {
      const userConfig = readClaudeUserConfig();
      envVars = { ...userConfig.env } || {};
    } else {
      const projectConfig = readClaudeProjectConfig(projectRoot);
      envVars = { ...projectConfig.env } || {};
    }

    console.log(chalk.cyan(`\n📝 Editing ${level}-level environment variables (编辑${level === 'project' ? '项目' : '用户'}级别环境变量)\n`));

    while (true) {
      console.log(chalk.bold('Current environment variables (当前环境变量):'));
      const keys = Object.keys(envVars);
      if (keys.length === 0) {
        console.log(chalk.gray('  (None)'));
      } else {
        keys.forEach((key, index) => {
          console.log(`  ${index + 1}. ${chalk.cyan(key)} = ${chalk.yellow(maskEnvValue(key, envVars[key]))}`);
        });
      }
      console.log('');

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Select action (请选择操作):',
          choices: [
            { name: 'Add new variable (添加新变量)', value: 'add' },
            { name: 'Edit variable (编辑变量)', value: 'edit' },
            { name: 'Remove variable (删除变量)', value: 'remove' },
            { name: 'Save and exit (保存并退出)', value: 'save' },
            { name: 'Cancel (取消)', value: 'cancel' }
          ]
        }
      ]);

      if (action === 'save') {
        if (isUserLevel) {
          const userConfig = readClaudeUserConfig();
          userConfig.env = envVars;
          writeClaudeUserConfig(userConfig);
        } else {
          const projectConfig = readClaudeProjectConfig(projectRoot);
          projectConfig.env = envVars;
          writeClaudeProjectConfig(projectConfig, projectRoot);
        }
        console.log(chalk.green('✓ Environment variables saved successfully! (环境变量保存成功!)\n'));
        return;
      }

      if (action === 'cancel') {
        console.log(chalk.yellow('Operation cancelled. Changes not saved. (操作已取消。更改未保存。)\n'));
        return;
      }

      if (action === 'add') {
        const { key, value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'key',
            message: 'Enter variable name (请输入变量名):',
            validate: (input) => {
              if (!input.trim()) return 'Variable name is required';
              if (!/^[A-Z_][A-Z0-9_]*$/.test(input.trim())) {
                return 'Invalid format. Use uppercase letters, numbers, and underscores';
              }
              if (envVars[input.trim()]) return 'Variable already exists';
              return true;
            }
          },
          {
            type: 'input',
            name: 'value',
            message: 'Enter variable value (请输入变量值):',
            validate: (input) => input.trim() !== '' || 'Value is required'
          }
        ]);
        envVars[key.trim()] = value.trim();
      } else if (action === 'edit') {
        if (keys.length === 0) {
          console.log(chalk.yellow('No variables to edit.\n'));
          continue;
        }
        const { key } = await inquirer.prompt([
          {
            type: 'list',
            name: 'key',
            message: 'Select variable to edit (请选择要编辑的变量):',
            choices: keys
          }
        ]);
        const { value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `Enter new value for ${key}:`,
            default: envVars[key]
          }
        ]);
        envVars[key] = value.trim();
      } else if (action === 'remove') {
        if (keys.length === 0) {
          console.log(chalk.yellow('No variables to remove.\n'));
          continue;
        }
        const { key } = await inquirer.prompt([
          {
            type: 'list',
            name: 'key',
            message: 'Select variable to remove (请选择要删除的变量):',
            choices: keys
          }
        ]);
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Remove variable '${key}'?`,
            default: false
          }
        ]);
        if (confirm) {
          delete envVars[key];
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('✗ Error editing environment variables:'), error.message);
  }
}

module.exports = {
  listEnv,
  addEnv,
  setEnv,
  removeEnv,
  unsetEnv,
  showEnv,
  clearEnv,
  editEnv
};
