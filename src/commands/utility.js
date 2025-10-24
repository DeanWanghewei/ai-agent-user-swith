const chalk = require('chalk');
const ConfigManager = require('../config');
const { validateAccount } = require('./helpers');

const config = new ConfigManager();

/**
 * Show configuration paths
 */
function showPaths() {
  const paths = config.getConfigPaths();
  const projectRoot = config.findProjectRoot();

  console.log(chalk.bold('\n📂 Configuration Paths (配置路径):\n'));
  console.log(`${chalk.cyan('Global config file (全局配置文件):')} ${paths.global}`);
  console.log(`${chalk.cyan('Global config directory (全局配置目录):')} ${paths.globalDir}`);
  console.log(`${chalk.cyan('Project config file (项目配置文件):')} ${paths.project}`);

  if (projectRoot) {
    const claudeConfigPath = require('path').join(projectRoot, '.claude', 'settings.local.json');
    const fs = require('fs');
    console.log(`${chalk.cyan('Claude config file (Claude 配置文件):')} ${claudeConfigPath}`);
    console.log(`${chalk.cyan('Claude config exists (Claude 配置是否存在):')} ${fs.existsSync(claudeConfigPath) ? chalk.green('✓ Yes (是)') : chalk.red('✗ No (否)')}`);
    console.log(`${chalk.cyan('Project root (项目根目录):')} ${projectRoot}`);
    console.log(`${chalk.cyan('Current directory (当前目录):')} ${process.cwd()}`);
  } else {
    console.log(chalk.yellow('\n⚠ Not in a configured project directory (不在已配置的项目目录中)'));
  }
  console.log('');
}

/**
 * Diagnose Claude Code configuration issues
 */
async function doctor() {
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
    console.log(chalk.yellow('   Run "ais use <account>" in your project root first (请先在项目根目录运行 "ais use <账号名>")\n'));
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

  // Check Droids config
  const droidsDir = path.join(projectRoot, '.droids');
  const droidsConfigPath = path.join(droidsDir, 'config.json');

  console.log(chalk.bold('\n5. Droids Configuration:'));
  console.log(`   Expected location: ${droidsConfigPath}`);

  if (fs.existsSync(droidsConfigPath)) {
    console.log(chalk.green('   ✓ Droids config exists'));
    try {
      const droidsConfig = JSON.parse(fs.readFileSync(droidsConfigPath, 'utf8'));

      if (droidsConfig.apiKey) {
        const masked = droidsConfig.apiKey.substring(0, 6) + '****' + droidsConfig.apiKey.substring(droidsConfig.apiKey.length - 4);
        console.log(`   API Key: ${masked}`);
      }

      if (droidsConfig.baseUrl) {
        console.log(`   Base URL: ${droidsConfig.baseUrl}`);
      }

      if (droidsConfig.model) {
        console.log(`   Model: ${droidsConfig.model}`);
      }

      if (droidsConfig.customSettings) {
        console.log(`   Custom Settings: ${Object.keys(droidsConfig.customSettings).join(', ')}`);
      }
    } catch (e) {
      console.log(chalk.red(`   ✗ Error reading Droids config: ${e.message}`));
    }
  } else {
    console.log(chalk.yellow('   ⚠ Droids config not found'));
    console.log(chalk.yellow('   Run "ais use <droids-account>" to generate it'));
  }

  // Check Codex profile
  const codexProfilePath = path.join(projectRoot, '.codex-profile');
  const globalCodexConfig = path.join(os.homedir(), '.codex', 'config.toml');

  console.log(chalk.bold('\n6. Codex Configuration:'));
  console.log(`   Profile file: ${codexProfilePath}`);

  if (fs.existsSync(codexProfilePath)) {
    const profileName = fs.readFileSync(codexProfilePath, 'utf8').trim();
    console.log(chalk.green(`   ✓ Codex profile exists: ${profileName}`));
    console.log(chalk.cyan(`   Usage: codex --profile ${profileName} [prompt]`));

    // Check if profile exists in global config
    if (fs.existsSync(globalCodexConfig)) {
      try {
        const globalConfig = fs.readFileSync(globalCodexConfig, 'utf8');
        const profilePattern = new RegExp(`\\[profiles\\.${profileName}\\]`);

        if (profilePattern.test(globalConfig)) {
          console.log(chalk.green(`   ✓ Profile configured in ~/.codex/config.toml`));

          // Parse profile info
          const providerMatch = globalConfig.match(new RegExp(`\\[profiles\\.${profileName}\\][\\s\\S]*?model_provider\\s*=\\s*"([^"]+)"`));
          const modelMatch = globalConfig.match(new RegExp(`\\[profiles\\.${profileName}\\][\\s\\S]*?model\\s*=\\s*"([^"]+)"`));

          if (providerMatch) {
            console.log(`   Model Provider: ${providerMatch[1]}`);

            // Find provider details
            const providerName = providerMatch[1];
            const baseUrlMatch = globalConfig.match(new RegExp(`\\[model_providers\\.${providerName}\\][\\s\\S]*?base_url\\s*=\\s*"([^"]+)"`));
            if (baseUrlMatch) {
              console.log(`   API URL: ${baseUrlMatch[1]}`);
            }
          }
          if (modelMatch) {
            console.log(`   Model: ${modelMatch[1]}`);
          }
        } else {
          console.log(chalk.yellow(`   ⚠ Profile not found in global config`));
          console.log(chalk.yellow(`   Run "ais use <account>" to regenerate it`));
        }
      } catch (e) {
        console.log(chalk.red(`   ✗ Error reading global Codex config: ${e.message}`));
      }
    }
  } else {
    console.log(chalk.yellow('   ⚠ No Codex profile configured'));
    console.log(chalk.yellow('   Run "ais use <codex-account>" to create one'));
  }

  // Check global Claude config
  const globalClaudeConfig = path.join(os.homedir(), '.claude', 'settings.json');
  console.log(chalk.bold('\n7. Global Claude Configuration:'));
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

  // Check current account availability
  console.log(chalk.bold('\n8. Current Account Availability:'));
  const projectAccount = config.getProjectAccount();

  if (projectAccount && projectAccount.apiKey) {
    console.log(`   Testing account: ${chalk.cyan(projectAccount.name)}`);
    console.log(`   Account type: ${chalk.cyan(projectAccount.type)}`);

    if (projectAccount.type === 'Claude') {
      console.log('   Testing with Claude CLI...');
      const { execSync } = require('child_process');
      try {
        execSync('claude --version', { stdio: 'pipe', timeout: 5000 });
        console.log(chalk.green('   ✓ Claude CLI is available'));

        // Interactive CLI test
        console.log('   Running interactive test...');
        try {
          const testResult = execSync('echo "test" | claude', {
            encoding: 'utf8',
            timeout: 10000,
            env: { ...process.env, ANTHROPIC_API_KEY: projectAccount.apiKey }
          });
          console.log(chalk.green('   ✓ Claude CLI interactive test passed'));
        } catch (e) {
          console.log(chalk.yellow('   ⚠ Claude CLI interactive test failed'));
          console.log(chalk.gray(`   Error: ${e.message}`));
        }
      } catch (e) {
        console.log(chalk.yellow('   ⚠ Claude CLI not found, using API validation'));
      }
    } else if (projectAccount.type === 'Codex') {
      console.log('   Testing with Codex CLI...');
      const { execSync } = require('child_process');
      try {
        execSync('codex --version', { stdio: 'pipe', timeout: 5000 });
        console.log(chalk.green('   ✓ Codex CLI is available'));
      } catch (e) {
        console.log(chalk.yellow('   ⚠ Codex CLI not found'));
      }
    } else if (projectAccount.type === 'Droids') {
      console.log('   Testing with Droids CLI...');
      const { execSync } = require('child_process');
      try {
        execSync('droid --version', { stdio: 'pipe', timeout: 5000 });
        console.log(chalk.green('   ✓ Droids CLI is available'));
      } catch (e) {
        console.log(chalk.yellow('   ⚠ Droids CLI not found'));
      }
    }

    console.log(`   API URL: ${projectAccount.apiUrl || 'https://api.anthropic.com'}`);
    console.log('   Validating API key...');

    const result = await validateAccount(projectAccount.apiKey, projectAccount.apiUrl);

    if (result.valid) {
      console.log(chalk.green('   ✓ Account is valid and accessible'));
      if (result.statusCode) {
        console.log(chalk.gray(`   Response status: ${result.statusCode}`));
      }
    } else {
      console.log(chalk.red('   ✗ Account validation failed'));
      if (result.error) {
        console.log(chalk.red(`   Error: ${result.error}`));
      } else if (result.statusCode) {
        console.log(chalk.red(`   Status code: ${result.statusCode}`));
        if (result.statusCode === 401 || result.statusCode === 403) {
          console.log(chalk.yellow('   ⚠ API key appears to be invalid or expired'));
        }
      }
    }
  } else {
    console.log(chalk.yellow('   ⚠ No account configured or API key missing'));
  }

  // Recommendations
  console.log(chalk.bold('\n9. Recommendations:'));

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

  console.log(chalk.bold('\n10. Next Steps:'));
  console.log(chalk.cyan('   • Start Claude Code/Codex/Droids from your project directory or subdirectory'));
  console.log(chalk.cyan('   • Check which account is being used'));
  console.log(chalk.cyan('   • If wrong account is used, run: ais use <correct-account>'));
  console.log('');
}

/**
 * Start Web UI server
 */
function startUI() {
  const UIServer = require('../ui-server');
  const server = new UIServer();

  console.log(chalk.cyan('\n🌐 Starting AIS Web UI... (正在启动 AIS Web 界面...)\n'));
  server.start();
}

module.exports = {
  showPaths,
  doctor,
  startUI
};
