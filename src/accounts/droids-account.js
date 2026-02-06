/**
 * Droids Account Strategy
 * Handles Droids-specific account operations
 */
const chalk = require('chalk');
const BaseAccountStrategy = require('./base-account');

class DroidsAccountStrategy extends BaseAccountStrategy {
  constructor() {
    super('Droids');
  }

  showConfigTips() {
    console.log(
      chalk.cyan("\n📝 Droids Configuration Tips (Droids 配置提示):")
    );
    console.log(
      chalk.gray(
        "   • Droids configuration will be stored in .droids/config.json"
      )
    );
    console.log(
      chalk.gray(
        "   • API URL is optional (defaults to Droids default endpoint)"
      )
    );
    console.log(
      chalk.gray(
        "   • You can configure custom models and settings\n"
      )
    );
  }

  async collectTypeSpecificData(inquirer) {
    // Droids doesn't require additional type-specific data
    // Model is optional and will be collected in the main flow
    return {};
  }

  showUsageInstructions(accountName) {
    super.showUsageInstructions(accountName);
    console.log(
      chalk.white(
        "2. Start Droids in your project directory (在项目目录中启动 Droids)"
      )
    );
    console.log(
      chalk.white(
        "3. Droids will automatically use the configuration from .droids/config.json\n"
      )
    );
  }

  showPostSwitchMessage(account) {
    console.log(
      chalk.cyan(
        `✓ Droids configuration generated at: .droids/config.json`
      )
    );
    console.log("");
    console.log(chalk.bold.cyan("📖 Next Steps (下一步):"));
    console.log(
      chalk.yellow(
        `   Start interactive session: ${chalk.bold("droid")}`
      )
    );
    console.log(
      chalk.white(
        "   This will enter project-level interactive mode (这将进入项目级交互模式)"
      )
    );
    console.log(
      chalk.white(
        "   Droids will automatically use the configuration from .droids/config.json"
      )
    );
  }
}

module.exports = DroidsAccountStrategy;
