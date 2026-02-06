/**
 * Claude Account Strategy
 * Handles Claude-specific account operations
 */
const chalk = require('chalk');
const BaseAccountStrategy = require('./base-account');

class ClaudeAccountStrategy extends BaseAccountStrategy {
  constructor() {
    super('Claude');
  }

  showConfigTips() {
    // No special tips needed for Claude accounts
  }

  async collectTypeSpecificData(inquirer) {
    // Claude accounts use model groups, handled separately
    return {};
  }

  showUsageInstructions(accountName) {
    super.showUsageInstructions(accountName);
    console.log(
      chalk.white(
        "2. Start Claude Code in your project directory (在项目目录中启动 Claude Code)"
      )
    );
    console.log(
      chalk.white(
        "3. Claude Code will automatically use the project configuration (Claude Code 将自动使用项目配置)\n"
      )
    );
  }

  showPostSwitchMessage(account) {
    console.log(
      chalk.cyan(
        `✓ Claude configuration generated at: .claude/settings.local.json`
      )
    );
    console.log("");
    console.log(chalk.bold.cyan("📖 Next Steps (下一步):"));
    console.log(
      chalk.yellow(
        `   Start interactive session: ${chalk.bold("claude")}`
      )
    );
    console.log(
      chalk.white(
        "   This will enter project-level interactive mode (这将进入项目级交互模式)"
      )
    );
    console.log(
      chalk.white(
        "   Claude Code will automatically use the project configuration (Claude Code 将自动使用项目配置)"
      )
    );
  }
}

module.exports = ClaudeAccountStrategy;
