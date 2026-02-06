/**
 * CCR Account Strategy
 * Handles CCR-specific account operations
 */
const chalk = require('chalk');
const BaseAccountStrategy = require('./base-account');

class CCRAccountStrategy extends BaseAccountStrategy {
  constructor() {
    super('CCR');
  }

  showConfigTips() {
    console.log(
      chalk.cyan("\n📝 CCR Configuration Tips (CCR 配置提示):")
    );
    console.log(
      "   • CCR configuration will be stored in ~/.claude-code-router/config.json"
    );
    console.log(
      "   • You need to provide Provider name and models (您需要提供 Provider 名称和模型列表)"
    );
    console.log(
      "   • Router configuration will be automatically updated (Router 配置将自动更新)\n"
    );
  }

  async collectTypeSpecificData(inquirer) {
    const ccrConfig = await inquirer.prompt([
      {
        type: "input",
        name: "providerName",
        message: "Enter Provider name (请输入 Provider 名称):",
        validate: (input) =>
          input.trim() !== "" || "Provider name is required (Provider 名称不能为空)",
      },
      {
        type: "input",
        name: "defaultModel",
        message: "Enter default model (请输入 default 模型):",
        validate: (input) =>
          input.trim() !== "" || "Default model is required (默认模型不能为空)",
      },
      {
        type: "input",
        name: "backgroundModel",
        message: "Enter background model (请输入 background 模型):",
        validate: (input) =>
          input.trim() !== "" || "Background model is required (background 模型不能为空)",
      },
      {
        type: "input",
        name: "thinkModel",
        message: "Enter think model (请输入 think 模型):",
        validate: (input) =>
          input.trim() !== "" || "Think model is required (think 模型不能为空)",
      },
    ]);

    const models = [
      ccrConfig.defaultModel.trim(),
      ccrConfig.backgroundModel.trim(),
      ccrConfig.thinkModel.trim()
    ];
    const uniqueModels = [...new Set(models)];

    return {
      ccrConfig: {
        providerName: ccrConfig.providerName.trim(),
        models: uniqueModels,
        defaultModel: ccrConfig.defaultModel.trim(),
        backgroundModel: ccrConfig.backgroundModel.trim(),
        thinkModel: ccrConfig.thinkModel.trim(),
      }
    };
  }

  showUsageInstructions(accountName) {
    super.showUsageInstructions(accountName);
    console.log(
      chalk.white(
        "2. CCR configuration will be updated in ~/.claude-code-router/config.json"
      )
    );
  }

  showPostSwitchMessage(account) {
    console.log(
      chalk.cyan(
        `✓ CCR configuration updated at: ~/.claude-code-router/config.json`
      )
    );
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
        "   Claude Code will use CCR Router to route requests (Claude Code 将使用 CCR Router 路由请求)"
      )
    );
  }
}

module.exports = CCRAccountStrategy;
