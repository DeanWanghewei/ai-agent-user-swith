/**
 * Base Account Strategy
 * Provides default behavior for account type-specific operations
 */
const chalk = require('chalk');

class BaseAccountStrategy {
  constructor(accountType) {
    this.accountType = accountType;
  }

  showConfigTips() {
    // Default: no tips
  }

  async collectTypeSpecificData(inquirer) {
    return {};
  }

  showUsageInstructions(accountName) {
    console.log(
      chalk.bold.cyan("\n📖 Usage Instructions (使用说明):\n")
    );
    console.log(
      chalk.white("1. Switch to this account in your project (在项目中切换到此账号):")
    );
    console.log(chalk.cyan(`   ais use ${accountName}\n`));
  }

  showPostSwitchMessage(account) {
    console.log(
      chalk.cyan(
        `✓ Configuration generated (配置已生成)`
      )
    );
  }
}

module.exports = BaseAccountStrategy;
