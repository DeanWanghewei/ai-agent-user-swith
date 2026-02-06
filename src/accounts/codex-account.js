/**
 * Codex Account Strategy
 * Handles Codex-specific account operations
 */
const chalk = require('chalk');
const BaseAccountStrategy = require('./base-account');
const { WIRE_API_MODES, DEFAULT_WIRE_API } = require('../constants');

class CodexAccountStrategy extends BaseAccountStrategy {
  constructor() {
    super('Codex');
  }

  showConfigTips() {
    console.log(
      chalk.cyan("\n📝 Codex Configuration Tips (Codex 配置提示):")
    );
    console.log(
      chalk.gray(
        "   • For domain-only URLs (e.g., https://api.example.com), /v1 will be added automatically"
      )
    );
    console.log(
      chalk.gray(
        "     对于仅域名的 URL (例如 https://api.example.com), 将自动添加 /v1"
      )
    );
    console.log(
      chalk.gray(
        "   • URLs with existing paths (e.g., https://api.example.com/v2) will remain unchanged"
      )
    );
    console.log(
      chalk.gray(
        "     已有路径的 URL (例如 https://api.example.com/v2) 将保持不变"
      )
    );
    console.log(
      chalk.gray(
        "   • Codex uses OpenAI-compatible API format (Codex 使用 OpenAI 兼容的 API 格式)\n"
      )
    );
  }

  async collectTypeSpecificData(inquirer) {
    const wireApiAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "wireApi",
        message: "Select wire_api mode (请选择 wire_api 模式):",
        choices: [
          {
            name: "chat - Use API key in HTTP headers (OpenAI-compatible)",
            value: WIRE_API_MODES.CHAT
          },
          {
            name: "responses - Use API key in auth.json (requires_openai_auth)",
            value: WIRE_API_MODES.RESPONSES
          },
          {
            name: "env - Use API key from environment variable",
            value: WIRE_API_MODES.ENV
          }
        ],
        default: DEFAULT_WIRE_API
      }
    ]);

    const wireApiSelection = wireApiAnswer.wireApi;

    if (!Object.values(WIRE_API_MODES).includes(wireApiSelection)) {
      console.log(
        chalk.yellow(
          `⚠ Invalid wire_api mode, using default: ${DEFAULT_WIRE_API}`
        )
      );
      return { wireApi: DEFAULT_WIRE_API };
    }

    console.log(
      chalk.cyan(
        `\n✓ Selected wire_api mode (已选择模式): ${wireApiSelection}\n`
      )
    );

    const result = { wireApi: wireApiSelection };

    if (wireApiSelection === WIRE_API_MODES.ENV) {
      const envKeyAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "envKey",
          message: "Enter environment variable name for API key (请输入 API key 的环境变量名称):",
          default: "AIS_USER_API_KEY",
          validate: (input) => {
            if (!input.trim()) {
              return "Environment variable name is required (环境变量名称不能为空)";
            }
            if (!/^[A-Z_][A-Z0-9_]*$/.test(input.trim())) {
              return "Invalid variable name. Use uppercase letters, numbers, and underscores";
            }
            return true;
          }
        }
      ]);
      result.envKey = envKeyAnswer.envKey.trim();
      console.log(
        chalk.cyan(
          `\n✓ Environment variable (环境变量): ${result.envKey}\n`
        )
      );
    }

    return result;
  }

  showUsageInstructions(accountName) {
    super.showUsageInstructions(accountName);
    console.log(
      chalk.white(
        "2. Use Codex with the generated profile (使用生成的配置文件运行 Codex):"
      )
    );
    console.log(
      chalk.cyan(`   codex --profile ais_<project-name> "your prompt"\n`)
    );
    console.log(
      chalk.white(
        '3. The profile name will be shown when you run "ais use"\n'
      )
    );
  }

  showPostSwitchMessage(account) {
    const fs = require('fs');
    const path = require('path');
    const profileFile = path.join(process.cwd(), '.codex-profile');

    if (fs.existsSync(profileFile)) {
      const profileName = fs.readFileSync(profileFile, 'utf8').trim();
      console.log(
        chalk.cyan(
          `✓ Codex profile created (Codex 配置文件已创建): ${profileName}`
        )
      );

      if (account.wireApi === WIRE_API_MODES.RESPONSES) {
        console.log(
          chalk.yellow(
            `✓ Wire API mode: ${WIRE_API_MODES.RESPONSES}`
          )
        );
        console.log(
          chalk.yellow(
            `✓ API key stored in ~/.codex/auth.json`
          )
        );
      } else if (account.wireApi === WIRE_API_MODES.ENV) {
        console.log(
          chalk.yellow(
            `✓ Wire API mode: ${WIRE_API_MODES.ENV}`
          )
        );
        console.log(
          chalk.green(`\n✓ Copy and run this command:`)
        );
        const envKey = account.envKey || 'AIS_USER_API_KEY';
        console.log(
          chalk.cyan.bold(
            `   export ${envKey}="${account.apiKey}" && codex --profile ${profileName}`
          )
        );
      } else {
        console.log(
          chalk.cyan(
            `✓ Wire API mode: ${WIRE_API_MODES.CHAT}`
          )
        );
      }

      console.log("");
      console.log(chalk.bold.cyan("📖 Next Steps (下一步):"));
      console.log(
        chalk.yellow(
          `   Start interactive session: ${chalk.bold(`codex --profile ${profileName}`)}`
        )
      );
    }
  }
}

module.exports = CodexAccountStrategy;
