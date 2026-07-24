const chalk = require("chalk");
const inquirer = require("inquirer");
const ConfigManager = require("../config");
const { WIRE_API_MODES, DEFAULT_WIRE_API, ACCOUNT_TYPES } = require("../config");
const { maskApiKey } = require("./helpers");
const { promptForModelGroup } = require("./model");

const config = new ConfigManager();

/**
 * Add a new account
 */
async function addAccount(name, options) {
    // Provider selection: built-in Claude-protocol presets or Custom (all types)
    const { PRESETS, findPreset } = require("../presets");
    const providerChoices = [
        ...PRESETS.map((p) => ({
            name: `${p.name}  ${chalk.gray(p.apiUrl)}`,
            value: p.key,
        })),
        { name: "自定义 Custom (手动配置, 所有类型)", value: "__custom__" },
    ];
    const { provider } = await inquirer.prompt([
        {
            type: "list",
            name: "provider",
            message: "选择提供商 Select provider:",
            choices: providerChoices,
        },
    ]);

    if (provider !== "__custom__") {
        return addAccountFromPreset(findPreset(provider), name);
    }

    // If name not provided, prompt for it
    if (!name) {
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "accountName",
                message: "Enter account name (请输入账号名称):",
                validate: (input) =>
                    input.trim() !== "" ||
                    "Account name is required (账号名称不能为空)",
            },
        ]);
        name = answers.accountName;
    }

    // Check if account already exists
    if (config.accountExists(name)) {
        const { overwrite } = await inquirer.prompt([
            {
                type: "confirm",
                name: "overwrite",
                message: `Account '${name}' already exists. Overwrite? (账号 '${name}' 已存在。是否覆盖?)`,
                default: false,
            },
        ]);

        if (!overwrite) {
            console.log(chalk.yellow("Operation cancelled. (操作已取消。)"));
            return;
        }
    }

    // Prompt for account type first
    const typeAnswer = await inquirer.prompt([
        {
            type: "list",
            name: "type",
            message: "Select account type (请选择账号类型):",
            choices: ["Claude", "Codex", "CCR", "Droids", "Other"],
            default: "Claude",
        },
    ]);

    // Store wire_api selection for Codex accounts
    let wireApiSelection = null;

    // Show configuration tips based on account type
    if (typeAnswer.type === "Codex") {
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

        // Prompt for wire_api mode selection
        const wireApiAnswer = await inquirer.prompt([
            {
                type: "list",
                name: "wireApi",
                message: "Select wire_api mode (请选择 wire_api 模式):",
                choices: [
                    {
                        name: "chat - Use API key in HTTP headers (OpenAI-compatible) (在 HTTP 头中使用 API key,OpenAI 兼容)",
                        value: WIRE_API_MODES.CHAT
                    },
                    {
                        name: "responses - Use API key in auth.json (requires_openai_auth) (在 auth.json 中使用 API key)",
                        value: WIRE_API_MODES.RESPONSES
                    },
                    {
                        name: "env - Use API key from environment variable (从环境变量获取 API key)",
                        value: WIRE_API_MODES.ENV
                    }
                ],
                default: DEFAULT_WIRE_API
            }
        ]);

        wireApiSelection = wireApiAnswer.wireApi;

        // Validate input
        if (!Object.values(WIRE_API_MODES).includes(wireApiSelection)) {
            console.log(
                chalk.yellow(
                    `⚠ Invalid wire_api mode, using default: ${DEFAULT_WIRE_API} (无效的模式，使用默认值)`
                )
            );
            wireApiSelection = DEFAULT_WIRE_API;
        }

        console.log(
            chalk.cyan(
                `\n✓ Selected wire_api mode (已选择模式): ${wireApiSelection}\n`
            )
        );

        // If env mode is selected, prompt for environment variable name
        let envKeyName = null;
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
                            return "Invalid variable name. Use uppercase letters, numbers, and underscores (e.g., MY_API_KEY) (变量名无效。请使用大写字母、数字和下划线,例如: MY_API_KEY)";
                        }
                        return true;
                    }
                }
            ]);
            envKeyName = envKeyAnswer.envKey.trim();
            console.log(
                chalk.cyan(
                    `\n✓ Environment variable (环境变量): ${envKeyName}\n`
                )
            );
        }
    } else if (typeAnswer.type === "Droids") {
        console.log(
            chalk.cyan("\n📝 Droids Configuration Tips (Droids 配置提示):")
        );
        console.log(
            chalk.gray(
                "   • Droids configuration will be stored in .droids/config.json (Droids 配置将存储在 .droids/config.json)"
            )
        );
        console.log(
            chalk.gray(
                "   • API URL is optional (defaults to Droids default endpoint) (API URL 是可选的,默认使用 Droids 默认端点)"
            )
        );
        console.log(
            chalk.gray(
                "   • You can configure custom models and settings (您可以配置自定义模型和设置)\n"
            )
        );
    } else if (typeAnswer.type === "CCR") {
        console.log(
            chalk.cyan("\n📝 CCR Configuration Tips (CCR 配置提示):")
        );
        console.log(
            "   • CCR configuration will be stored in ~/.claude-code-router/config.json (CCR 配置将存储在 ~/.claude-code-router/config.json)"
        );
        console.log(
            "   • You need to provide Provider name and models (您需要提供 Provider 名称和模型列表)"
        );
        console.log(
            "   • Router configuration will be automatically updated (Router 配置将自动更新)\n"
        );
    }

    // Prompt for remaining account details
    const accountData = await inquirer.prompt([
        {
            type: "input",
            name: "apiKey",
            message: "Enter API Key (请输入 API Key):",
            validate: (input) =>
                input.trim() !== "" || "API Key is required (API Key 不能为空)",
        },
        {
            type: "input",
            name: "apiUrl",
            message:
                typeAnswer.type === "Codex"
                    ? "Enter API URL (请输入 API URL)\n" +
                      "  Examples (示例):\n" +
                      "    https://api.example.com → will add /v1 (将添加 /v1)\n" +
                      "    https://api.example.com/v2 → will keep as is (保持不变)\n" +
                      "  URL:"
                    : typeAnswer.type === "CCR"
                    ? "Enter API URL (请输入 API URL):"
                    : "Enter API URL (optional) (请输入 API URL,可选):",
            default: typeAnswer.type === "CCR" ? "http://localhost:3000/v1/chat/completions" : "",
        },
        {
            type: "input",
            name: "email",
            message: "Enter associated email (optional) (请输入关联邮箱,可选):",
            default: "",
        },
        {
            type: "input",
            name: "description",
            message: "Enter description (optional) (请输入描述,可选):",
            default: "",
        },
        {
            type: "confirm",
            name: "addCustomEnv",
            message:
                "Add custom environment variables (是否添加自定义环境变量?) ? (e.g., CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)",
            default: false,
        },
    ]);

    // Merge type into accountData
    accountData.type = typeAnswer.type;

    // Add wire_api selection for Codex accounts
    if (typeAnswer.type === "Codex" && wireApiSelection) {
        accountData.wireApi = wireApiSelection;
        // Add environment variable name for env mode
        if (wireApiSelection === WIRE_API_MODES.ENV && envKeyName) {
            accountData.envKey = envKeyName;
        }
    }

    // Handle custom environment variables
    if (accountData.addCustomEnv) {
        accountData.customEnv = {};
        let addMore = true;

        console.log(
            chalk.cyan(
                "\n💡 Tip (提示): Enter in format KEY=VALUE, e.g., CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 (请使用 KEY=VALUE 格式输入)"
            )
        );
        console.log(
            chalk.cyan("   Or leave empty to finish (留空则完成添加)\n")
        );

        while (addMore) {
            const envInput = await inquirer.prompt([
                {
                    type: "input",
                    name: "envVar",
                    message:
                        "Environment variable (KEY=VALUE format) (环境变量,KEY=VALUE 格式):",
                    validate: (input) => {
                        // Allow empty input to skip
                        if (!input.trim()) return true;

                        // Check if input contains '='
                        if (!input.includes("=")) {
                            return "Invalid format. Use KEY=VALUE format (e.g., MY_VAR=value) (格式无效。请使用 KEY=VALUE 格式,例如: MY_VAR=value)";
                        }

                        const [key, ...valueParts] = input.split("=");
                        const value = valueParts.join("="); // In case value contains '='

                        if (!key.trim()) {
                            return "Variable name cannot be empty (变量名不能为空)";
                        }

                        if (!/^[A-Z_][A-Z0-9_]*$/.test(key.trim())) {
                            return "Invalid variable name. Use uppercase letters, numbers, and underscores (e.g., MY_VAR) (变量名无效。请使用大写字母、数字和下划线,例如: MY_VAR)";
                        }

                        if (!value.trim()) {
                            return "Variable value cannot be empty (变量值不能为空)";
                        }

                        return true;
                    },
                },
            ]);

            // If user left input empty, skip adding more
            if (!envInput.envVar.trim()) {
                break;
            }

            // Parse KEY=VALUE
            const [key, ...valueParts] = envInput.envVar.split("=");
            const value = valueParts.join("="); // In case value contains '='

            accountData.customEnv[key.trim()] = value.trim();

            // Display currently added variables
            console.log(
                chalk.green("\n✓ Added (已添加):"),
                chalk.cyan(`${key.trim()}=${value.trim()}`)
            );

            if (Object.keys(accountData.customEnv).length > 0) {
                console.log(
                    chalk.bold(
                        "\n📋 Current environment variables (当前环境变量):"
                    )
                );
                Object.entries(accountData.customEnv).forEach(([k, v]) => {
                    console.log(chalk.gray("   •"), chalk.cyan(`${k}=${v}`));
                });
                console.log("");
            }

            const { continueAdding } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "continueAdding",
                    message:
                        "Add another environment variable? (是否继续添加环境变量?)",
                    default: false,
                },
            ]);

            addMore = continueAdding;
        }

        if (Object.keys(accountData.customEnv).length > 0) {
            console.log(
                chalk.green(
                    `\n✓ Total: ${
                        Object.keys(accountData.customEnv).length
                    } custom environment variable(s) added (总计: 已添加 ${
                        Object.keys(accountData.customEnv).length
                    } 个自定义环境变量)\n`
                )
            );
        } else {
            console.log(
                chalk.yellow(
                    "\n⚠ No custom environment variables added (未添加自定义环境变量)\n"
                )
            );
        }
    }

    // Remove the addCustomEnv flag before saving
    delete accountData.addCustomEnv;

    // Handle model configuration based on account type
    if (accountData.type === "Claude") {
        // Claude uses complex model groups
        accountData.modelGroups = {};
        accountData.activeModelGroup = null;

        // Prompt for model group configuration
        const { createModelGroup } = await inquirer.prompt([
            {
                type: "confirm",
                name: "createModelGroup",
                message:
                    "Do you want to create a model group? (Recommended) (是否创建模型组?推荐)",
                default: true,
            },
        ]);

        if (createModelGroup) {
            const groupName = "default";
            const modelGroupConfig = await promptForModelGroup();

            if (Object.keys(modelGroupConfig).length > 0) {
                accountData.modelGroups[groupName] = modelGroupConfig;
                accountData.activeModelGroup = groupName;
                console.log(
                    chalk.green(`\n✓ Created model group '${groupName}'`)
                );
            }
        }
    } else if (accountData.type === "Codex" || accountData.type === "Droids") {
        // Codex and Droids use simple model field
        const { addModel } = await inquirer.prompt([
            {
                type: "confirm",
                name: "addModel",
                message:
                    "Do you want to specify a model? (Optional) (是否指定模型?可选)",
                default: false,
            },
        ]);

        if (addModel) {
            const { model } = await inquirer.prompt([
                {
                    type: "input",
                    name: "model",
                    message: "Enter model name (请输入模型名称):",
                    default: "",
                },
            ]);

            if (model.trim()) {
                accountData.model = model.trim();
                console.log(
                    chalk.green(
                        `\n✓ Model set to (模型已设置为): ${accountData.model}`
                    )
                );
            }
        }
    } else if (accountData.type === "CCR") {
        // CCR needs provider name and models configuration
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

        accountData.ccrConfig = {
            providerName: ccrConfig.providerName.trim(),
            models: uniqueModels,
            defaultModel: ccrConfig.defaultModel.trim(),
            backgroundModel: ccrConfig.backgroundModel.trim(),
            thinkModel: ccrConfig.thinkModel.trim(),
        };

        console.log(
            chalk.green(
                `\n✓ CCR Provider: ${accountData.ccrConfig.providerName}`
            )
        );
        console.log(
            chalk.green(
                `✓ Default Model: ${accountData.ccrConfig.defaultModel}`
            )
        );
        console.log(
            chalk.green(
                `✓ Background Model: ${accountData.ccrConfig.backgroundModel}`
            )
        );
        console.log(
            chalk.green(
                `✓ Think Model: ${accountData.ccrConfig.thinkModel}`
            )
        );
    }

    // Save account
    config.addAccount(name, accountData);
    console.log(
        chalk.green(
            `✓ Account '${name}' added successfully! (账号 '${name}' 添加成功!)`
        )
    );

    // Show model configuration tips based on account type
    if (accountData.type === "Claude" && accountData.activeModelGroup) {
        console.log(
            chalk.cyan(
                `✓ Active model group (活动模型组): ${accountData.activeModelGroup}\n`
            )
        );
        console.log(
            chalk.cyan(
                '💡 Tip (提示): Use "ais model add" to create more model groups (使用 "ais model add" 创建更多模型组)'
            )
        );
        console.log(
            chalk.cyan(
                '💡 Tip (提示): Use "ais model list" to view all model groups (使用 "ais model list" 查看所有模型组)\n'
            )
        );
    } else if (
        (accountData.type === "Codex" || accountData.type === "Droids") &&
        accountData.model
    ) {
        console.log(chalk.cyan(`✓ Model (模型): ${accountData.model}\n`));
    } else if (accountData.type === "CCR" && accountData.ccrConfig) {
        console.log(chalk.cyan(`✓ CCR Provider: ${accountData.ccrConfig.providerName}\n`));
    }

    // Show usage instructions based on account type
    if (accountData.type === "Codex") {
        console.log(
            chalk.bold.cyan("\n📖 Codex Usage Instructions (Codex 使用说明):\n")
        );
        console.log(
            chalk.white(
                "1. Switch to this account in your project (在项目中切换到此账号):"
            )
        );
        console.log(chalk.cyan(`   ais use ${name}\n`));

        // Show wire_api mode specific information
        if (accountData.wireApi === WIRE_API_MODES.RESPONSES) {
            console.log(
                chalk.yellow(
                    "   ⚠ Note: This account uses 'responses' mode (此账号使用 'responses' 模式)"
                )
            );
            console.log(
                chalk.white(
                    "   Your API key will be stored in ~/.codex/auth.json (API key 将存储在 ~/.codex/auth.json)\n"
                )
            );
        } else if (accountData.wireApi === WIRE_API_MODES.ENV) {
            console.log(
                chalk.yellow(
                    "   ⚠ Note: This account uses 'env' mode (此账号使用 'env' 模式)"
                )
            );
            console.log(
                chalk.white(
                    `   You need to export the environment variable before using Codex (使用 Codex 前需要导出环境变量):`
                )
            );
            console.log(
                chalk.cyan(
                    `   export ${accountData.envKey}="${accountData.apiKey}"\n`
                )
            );
        } else {
            console.log(
                chalk.cyan(
                    "   ✓ This account uses 'chat' mode (此账号使用 'chat' 模式)\n"
                )
            );
        }

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
                '3. The profile name will be shown when you run "ais use" (运行 "ais use" 时会显示配置文件名)\n'
            )
        );
    } else if (accountData.type === "Claude") {
        console.log(
            chalk.bold.cyan(
                "\n📖 Claude Usage Instructions (Claude 使用说明):\n"
            )
        );
        console.log(
            chalk.white(
                "1. Switch to this account in your project (在项目中切换到此账号):"
            )
        );
        console.log(chalk.cyan(`   ais use ${name}\n`));
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
    } else if (accountData.type === "Droids") {
        console.log(
            chalk.bold.cyan(
                "\n📖 Droids Usage Instructions (Droids 使用说明):\n"
            )
        );
        console.log(
            chalk.white(
                "1. Switch to this account in your project (在项目中切换到此账号):"
            )
        );
        console.log(chalk.cyan(`   ais use ${name}\n`));
        console.log(
            chalk.white(
                "2. Start Droids in your project directory (在项目目录中启动 Droids)"
            )
        );
        console.log(
            chalk.white(
                "3. Droids will automatically use the configuration from .droids/config.json (Droids 将自动使用 .droids/config.json 中的配置)\n"
            )
        );
    } else if (accountData.type === "CCR") {
        console.log(
            chalk.bold.cyan(
                "\n📖 CCR Usage Instructions (CCR 使用说明):\n"
            )
        );
        console.log(
            chalk.white(
                "1. Switch to this account in your project (在项目中切换到此账号):"
            )
        );
        console.log(chalk.cyan(`   ais use ${name}\n`));
        console.log(
            chalk.white(
                "2. CCR configuration will be updated in ~/.claude-code-router/config.json (CCR 配置将更新到 ~/.claude-code-router/config.json)\n"
            )
        );
    }
}

/**
 * List all accounts
 */
function listAccounts() {
    const accounts = config.getAllAccounts();
    const accountNames = Object.keys(accounts);

    if (accountNames.length === 0) {
        console.log(
            chalk.yellow(
                'No accounts found. Use "ais add" to add an account. (未找到账号。请使用 "ais add" 添加账号。)'
            )
        );
        return;
    }

    const currentProject = config.getProjectAccount();

    console.log(chalk.bold("\n📋 Available Accounts (可用账号):\n"));

    accountNames.forEach((name) => {
        const account = accounts[name];
        const isActive = currentProject && currentProject.name === name;
        const marker = isActive ? chalk.green("● ") : "  ";

        // Display ID and name
        const idDisplay = chalk.yellow(`[${account.id}]`);
        const nameDisplay = isActive
            ? chalk.green.bold(name)
            : chalk.cyan(name);

        console.log(`${marker}${idDisplay} ${nameDisplay}`);
        console.log(`   Type: ${account.type}`);
        console.log(`   API Key: ${maskApiKey(account.apiKey)}`);
        if (account.apiUrl) console.log(`   API URL: ${account.apiUrl}`);
        if (account.email) console.log(`   Email: ${account.email}`);
        if (account.description)
            console.log(`   Description: ${account.description}`);
        if (account.customEnv && Object.keys(account.customEnv).length > 0) {
            console.log(
                `   Custom Env: ${Object.keys(account.customEnv).join(", ")}`
            );
        }
        // Display model configuration based on account type
        if (
            account.type === "Claude" &&
            account.modelGroups &&
            Object.keys(account.modelGroups).length > 0
        ) {
            const groupNames = Object.keys(account.modelGroups);
            const activeMarker = account.activeModelGroup
                ? ` (active: ${account.activeModelGroup})`
                : "";
            console.log(
                `   Model Groups: ${groupNames.join(", ")}${activeMarker}`
            );
        } else if (
            (account.type === "Codex" || account.type === "Droids") &&
            account.model
        ) {
            console.log(`   Model: ${account.model}`);
        }
        // Display wire_api configuration for Codex accounts
        if (account.type === ACCOUNT_TYPES.CODEX) {
            const wireApi = account.wireApi || `${DEFAULT_WIRE_API} (default)`;
            console.log(`   Wire API: ${wireApi}`);
        }
        console.log(
            `   Created: ${new Date(account.createdAt).toLocaleString()}`
        );
        console.log("");
    });

    if (currentProject) {
        console.log(
            chalk.green(
                `✓ Current project is using (当前项目正在使用): ${currentProject.name}\n`
            )
        );
    } else {
        console.log(
            chalk.yellow(
                '⚠ No account set for current project. Use "ais use <account>" to set one. (当前项目未设置账号。请使用 "ais use <账号名>" 设置。)\n'
            )
        );
    }
}

/**
 * Switch to a specific account for current project
 */
async function useAccount(nameOrId) {
    if (!nameOrId) {
        // If no name/ID provided, show interactive selection
        const accounts = config.getAllAccounts();
        const accountNames = Object.keys(accounts);

        if (accountNames.length === 0) {
            console.log(
                chalk.yellow(
                    'No accounts found. Use "ais add" to add an account first. (未找到账号。请先使用 "ais add" 添加账号。)'
                )
            );
            return;
        }

        // Create choices with ID and name
        const choices = accountNames.map(name => {
            const account = accounts[name];
            return {
                name: `[${account.id}] ${name}`,
                value: name
            };
        });

        const answers = await inquirer.prompt([
            {
                type: "list",
                name: "accountName",
                message: "Select an account to use (请选择要使用的账号):",
                choices: choices,
            },
        ]);

        nameOrId = answers.accountName;
    }

    // Find account by ID or name
    const accountInfo = config.getAccountByIdOrName(nameOrId);
    if (!accountInfo) {
        console.log(
            chalk.red(`✗ Account '${nameOrId}' not found. (未找到账号 '${nameOrId}'。)`)
        );
        console.log(
            chalk.yellow(
                'Use "ais list" to see available accounts. (请使用 "ais list" 查看可用账号。)'
            )
        );
        return;
    }

    const name = accountInfo.name;
    const success = config.setProjectAccount(name);
    if (success) {
        const fs = require("fs");
        const path = require("path");
        const { execSync } = require("child_process");
        const account = config.getAccount(name);

        console.log(
            chalk.green(
                `✓ Switched to account '${name}' for current project. (已为当前项目切换到账号 '${name}'。)`
            )
        );
        console.log(chalk.yellow(`Project (项目): ${process.cwd()}`));

        // Restart CCR if account type is CCR
        if (account && account.type === "CCR") {
            try {
                console.log(chalk.cyan("\n🔄 Restarting CCR Router... (重启 CCR Router...)"));
                execSync("ccr restart", { stdio: "inherit" });
                console.log(chalk.green("✓ CCR Router restarted successfully (CCR Router 重启成功)\n"));
            } catch (error) {
                console.log(chalk.yellow("⚠ Failed to restart CCR Router automatically (自动重启 CCR Router 失败)"));
                console.log(chalk.yellow("  Please run manually: ccr restart (请手动运行: ccr restart)\n"));
            }
        }

        // Show different messages based on account type
        if (account && account.type === "Codex") {
            const profileFile = path.join(process.cwd(), ".codex-profile");
            if (fs.existsSync(profileFile)) {
                const profileName = fs.readFileSync(profileFile, "utf8").trim();
                console.log(
                    chalk.cyan(
                        `✓ Codex profile created (Codex 配置文件已创建): ${profileName}`
                    )
                );

                // Display wire_api mode information
                if (account.wireApi === WIRE_API_MODES.RESPONSES) {
                    console.log(
                        chalk.yellow(
                            `✓ Wire API mode: ${WIRE_API_MODES.RESPONSES} (使用 ${WIRE_API_MODES.RESPONSES} 模式)`
                        )
                    );
                    console.log(
                        chalk.yellow(
                            `✓ API key stored in ~/.codex/auth.json (API key 已存储在 ~/.codex/auth.json)`
                        )
                    );
                } else if (account.wireApi === WIRE_API_MODES.ENV) {
                    console.log(
                        chalk.yellow(
                            `✓ Wire API mode: ${WIRE_API_MODES.ENV} (使用 ${WIRE_API_MODES.ENV} 模式)`
                        )
                    );
                    console.log(
                        chalk.green(
                            `\n✓ Copy and run this command (复制并执行此命令):`
                        )
                    );
                    console.log(
                        chalk.cyan.bold(
                            `   export ${account.envKey || 'AIS_USER_API_KEY'}="${account.apiKey}" && codex --profile ${profileName}`
                        )
                    );
                } else {
                    console.log(
                        chalk.cyan(
                            `✓ Wire API mode: ${WIRE_API_MODES.CHAT} (使用 ${WIRE_API_MODES.CHAT} 模式)`
                        )
                    );
                }

                console.log("");
                console.log(chalk.bold.cyan("📖 Next Steps (下一步):"));
                console.log(
                    chalk.yellow(
                        `   Start interactive session (启动交互式会话): ${chalk.bold(
                            `codex --profile ${profileName}`
                        )}`
                    )
                );
                console.log(
                    chalk.white(
                        "   This will enter project-level interactive mode (这将进入项目级交互模式)"
                    )
                );
            }
        } else if (account && account.type === "Droids") {
            console.log(
                chalk.cyan(
                    `✓ Droids configuration generated at (Droids 配置已生成至): .droids/config.json`
                )
            );
            console.log("");
            console.log(chalk.bold.cyan("📖 Next Steps (下一步):"));
            console.log(
                chalk.yellow(
                    `   Start interactive session (启动交互式会话): ${chalk.bold(
                        "droid"
                    )}`
                )
            );
            console.log(
                chalk.white(
                    "   This will enter project-level interactive mode (这将进入项目级交互模式)"
                )
            );
            console.log(
                chalk.white(
                    "   Droids will automatically use the configuration from .droids/config.json (Droids 将自动使用 .droids/config.json 中的配置)"
                )
            );
        } else if (account && account.type === "CCR") {
            console.log(
                chalk.cyan(
                    `✓ CCR configuration updated at (CCR 配置已更新至): ~/.claude-code-router/config.json`
                )
            );
            console.log(
                chalk.cyan(
                    `✓ Claude configuration generated at (Claude 配置已生成至): .claude/settings.local.json`
                )
            );
            console.log("");
            console.log(chalk.bold.cyan("📖 Next Steps (下一步):"));
            console.log(
                chalk.yellow(
                    `   Start interactive session (启动交互式会话): ${chalk.bold(
                        "claude"
                    )}`
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
        } else {
            console.log(
                chalk.cyan(
                    `✓ Claude configuration generated at (Claude 配置已生成至): .claude/settings.local.json`
                )
            );
            console.log("");
            console.log(chalk.bold.cyan("📖 Next Steps (下一步):"));
            console.log(
                chalk.yellow(
                    `   Start interactive session (启动交互式会话): ${chalk.bold(
                        "claude"
                    )}`
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

        // Check if .gitignore was updated
        const gitignorePath = path.join(process.cwd(), ".gitignore");
        const gitDir = path.join(process.cwd(), ".git");
        if (fs.existsSync(gitDir) && fs.existsSync(gitignorePath)) {
            console.log("");
            console.log(
                chalk.cyan(
                    `✓ Updated .gitignore to exclude AIS configuration files (已更新 .gitignore 以排除 AIS 配置文件)`
                )
            );
        }
    } else {
        console.log(chalk.red("✗ Failed to set account. (设置账号失败。)"));
    }
}

/**
 * Show current project's account info
 */
function showInfo() {
    const projectAccount = config.getProjectAccount();

    if (!projectAccount) {
        console.log(
            chalk.yellow(
                "⚠ No account set for current project. (当前项目未设置账号。)"
            )
        );
        console.log(chalk.yellow(`Project (项目): ${process.cwd()}`));
        console.log(
            chalk.cyan(
                '\nUse "ais use <account>" to set an account for this project. (使用 "ais use <账号名>" 为此项目设置账号。)'
            )
        );
        return;
    }

    console.log(
        chalk.bold("\n📌 Current Project Account Info (当前项目账号信息):\n")
    );
    console.log(`${chalk.cyan("Account ID:")} ${chalk.yellow(`[${projectAccount.id}]`)}`);
    console.log(
        `${chalk.cyan("Account Name:")} ${chalk.green.bold(
            projectAccount.name
        )}`
    );
    console.log(`${chalk.cyan("Type:")} ${projectAccount.type}`);
    console.log(
        `${chalk.cyan("API Key:")} ${maskApiKey(projectAccount.apiKey)}`
    );
    if (projectAccount.apiUrl)
        console.log(`${chalk.cyan("API URL:")} ${projectAccount.apiUrl}`);
    if (projectAccount.email)
        console.log(`${chalk.cyan("Email:")} ${projectAccount.email}`);
    if (projectAccount.description)
        console.log(
            `${chalk.cyan("Description:")} ${projectAccount.description}`
        );
    if (
        projectAccount.customEnv &&
        Object.keys(projectAccount.customEnv).length > 0
    ) {
        console.log(`${chalk.cyan("Custom Environment Variables:")}`);
        Object.entries(projectAccount.customEnv).forEach(([key, value]) => {
            console.log(`  ${chalk.gray("•")} ${key}: ${value}`);
        });
    }
    // Display model configuration based on account type
    if (
        projectAccount.type === "Claude" &&
        projectAccount.modelGroups &&
        Object.keys(projectAccount.modelGroups).length > 0
    ) {
        console.log(`${chalk.cyan("Model Groups:")}`);
        Object.keys(projectAccount.modelGroups).forEach((groupName) => {
            const isActive = projectAccount.activeModelGroup === groupName;
            const marker = isActive ? chalk.green("● ") : "  ";
            console.log(
                `${marker}${isActive ? chalk.green.bold(groupName) : groupName}`
            );
        });
        if (projectAccount.activeModelGroup) {
            console.log(
                `${chalk.cyan("Active Model Group:")} ${chalk.green.bold(
                    projectAccount.activeModelGroup
                )}`
            );
        }
    } else if (
        (projectAccount.type === "Codex" || projectAccount.type === "Droids") &&
        projectAccount.model
    ) {
        console.log(`${chalk.cyan("Model:")} ${projectAccount.model}`);
    }
    // Display wire_api configuration for Codex accounts
    if (projectAccount.type === ACCOUNT_TYPES.CODEX && projectAccount.wireApi) {
        console.log(`${chalk.cyan("Wire API:")} ${projectAccount.wireApi}`);
    }
    console.log(
        `${chalk.cyan("Set At:")} ${new Date(
            projectAccount.setAt
        ).toLocaleString()}`
    );
    console.log(`${chalk.cyan("Project Root:")} ${projectAccount.projectRoot}`);
    console.log(`${chalk.cyan("Current Directory:")} ${process.cwd()}\n`);
}

/**
 * Remove an account
 */
async function removeAccount(nameOrId) {
    if (!nameOrId) {
        const accounts = config.getAllAccounts();
        const accountNames = Object.keys(accounts);

        if (accountNames.length === 0) {
            console.log(chalk.yellow("No accounts found. (未找到账号。)"));
            return;
        }

        // Create choices with ID and name
        const choices = accountNames.map(name => {
            const account = accounts[name];
            return {
                name: `[${account.id}] ${name}`,
                value: name
            };
        });

        const answers = await inquirer.prompt([
            {
                type: "list",
                name: "accountName",
                message: "Select an account to remove (请选择要删除的账号):",
                choices: choices,
            },
        ]);

        nameOrId = answers.accountName;
    }

    // Find account by ID or name
    const accountInfo = config.getAccountByIdOrName(nameOrId);
    if (!accountInfo) {
        console.log(
            chalk.red(`✗ Account '${nameOrId}' not found. (未找到账号 '${nameOrId}'。)`)
        );
        return;
    }

    const name = accountInfo.name;

    const { confirm } = await inquirer.prompt([
        {
            type: "confirm",
            name: "confirm",
            message: `Are you sure you want to remove account '${name}' (ID: ${accountInfo.id})? (确定要删除账号 '${name}' (ID: ${accountInfo.id}) 吗?)`,
            default: false,
        },
    ]);

    if (!confirm) {
        console.log(chalk.yellow("Operation cancelled. (操作已取消。)"));
        return;
    }

    const success = config.removeAccount(name);
    if (success) {
        console.log(
            chalk.green(
                `✓ Account '${name}' removed successfully. (账号 '${name}' 删除成功。)`
            )
        );
    } else {
        console.log(chalk.red("✗ Failed to remove account. (删除账号失败。)"));
    }
}

/**
 * Show current account for current project
 */
function showCurrent() {
    const projectAccount = config.getProjectAccount();

    if (!projectAccount) {
        console.log(
            chalk.yellow(
                "⚠ No account set for current project. (当前项目未设置账号。)"
            )
        );
        return;
    }

    console.log(
        chalk.green(
            `Current account (当前账号): ${chalk.bold(projectAccount.name)}`
        )
    );
}

/**
 * Export account configuration
 */
function exportAccount(nameOrId) {
    if (!nameOrId) {
        console.log(
            chalk.red("Please specify an account name or ID. (请指定账号名称或 ID。)")
        );
        console.log(
            chalk.cyan(
                "Usage: ais export <account-name-or-id> (用法: ais export <账号名或ID>)"
            )
        );
        return;
    }

    // Find account by ID or name
    const accountInfo = config.getAccountByIdOrName(nameOrId);
    if (!accountInfo) {
        console.log(
            chalk.red(`✗ Account '${nameOrId}' not found. (未找到账号 '${nameOrId}'。)`)
        );
        return;
    }

    const name = accountInfo.name;
    const { name: _, ...account } = accountInfo; // Remove the name property from accountInfo

    console.log(
        chalk.bold(
            `\n📤 Export for account '${name}' (ID: ${account.id}) (账号 '${name}' 的导出数据):\n`
        )
    );
    console.log(JSON.stringify({ [name]: account }, null, 2));
    console.log("");
}

/**
 * Create a Claude account from a built-in preset.
 * Asks only for API Key + confirmable Base URL + active model group.
 */
async function addAccountFromPreset(preset, name) {
    if (!preset) {
        console.error(chalk.red("✗ Unknown preset (未知预设)。"));
        return;
    }
    const labels = {
        latest: preset.modelGroups.latest.label,
        balanced: preset.modelGroups.balanced.label,
    };

    console.log(chalk.bold.cyan(`\n📋 ${preset.name} 预设 (Preset)`));
    console.log(chalk.gray(`   Base URL: ${preset.apiUrl}`));
    console.log(chalk.gray(`   模型组: ${labels.balanced}(balanced) / ${labels.latest}(latest)`));
    if (Object.keys(preset.customEnv).length > 0) {
        console.log(
            chalk.gray(
                `   环境变量: ${Object.keys(preset.customEnv).map((k) => `${k}=${preset.customEnv[k]}`).join(", ")}`
            )
        );
    }
    const groupEnvSample = Object.keys(preset.modelGroups.latest.config)
        .filter((k) => !["DEFAULT_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL", "ANTHROPIC_MODEL"].includes(k))
        .join(", ");
    if (groupEnvSample) console.log(chalk.gray(`   组级参数(示例): ${groupEnvSample}`));
    console.log("");

    if (!name) {
        const ans = await inquirer.prompt([
            {
                type: "input",
                name: "accountName",
                message: "Account name (账号名称):",
                default: preset.key,
                validate: (input) => input.trim() !== "" || "Name is required (名称不能为空)",
            },
        ]);
        name = ans.accountName.trim();
    }

    if (config.accountExists(name)) {
        const { overwrite } = await inquirer.prompt([
            { type: "confirm", name: "overwrite", message: `Account '${name}' already exists. Overwrite? (账号 '${name}' 已存在。是否覆盖?)`, default: false },
        ]);
        if (!overwrite) {
            console.log(chalk.yellow("Operation cancelled. (操作已取消。)"));
            return;
        }
    }

    const { apiKey } = await inquirer.prompt([
        { type: "password", name: "apiKey", message: "Enter API Key (请输入 API Key):", mask: "*", validate: (input) => input.trim() !== "" || "API Key is required (API Key 不能为空)" },
    ]);

    const { apiUrl } = await inquirer.prompt([
        { type: "input", name: "apiUrl", message: "Base URL — press Enter to confirm, or edit (直接回车确认,或修改):", default: preset.apiUrl, validate: (input) => input.trim() !== "" || "Base URL is required (Base URL 不能为空)" },
    ]);

    const modelGroups = {
        latest: { ...preset.modelGroups.latest.config },
        balanced: { ...preset.modelGroups.balanced.config },
    };
    const { active } = await inquirer.prompt([
        {
            type: "list",
            name: "active",
            message: "Active model group (激活模型组):",
            choices: [
                { name: `${labels.latest} (latest)`, value: "latest" },
                { name: `${labels.balanced} (balanced)`, value: "balanced" },
                { name: "➕ New custom model group (新建自定义模型组)", value: "__custom__" },
            ],
            default: preset.defaultActiveGroup,
        },
    ]);
    let activeModelGroup = active;
    if (active === "__custom__") {
        const { customGroupName } = await inquirer.prompt([
            {
                type: "input",
                name: "customGroupName",
                message: "Custom model group name (自定义模型组名称):",
                default: "custom",
                validate: (input) => {
                    const v = input.trim();
                    if (!v) return "Name is required (名称不能为空)";
                    if (v === "latest" || v === "balanced") return "Reserved name, pick another (名称保留,请换一个)";
                    return true;
                },
            },
        ]);
        const cfg = await promptForModelGroup();
        if (Object.keys(cfg).length === 0) {
            console.log(chalk.yellow("⚠ No config provided, using balanced as active (未提供配置,使用 balanced 作为活动组)。"));
            activeModelGroup = "balanced";
        } else {
            modelGroups[customGroupName.trim()] = cfg;
            activeModelGroup = customGroupName.trim();
        }
    }

    const { email, description } = await inquirer.prompt([
        { type: "input", name: "email", message: "Email, optional (邮箱,可选):", default: "" },
        { type: "input", name: "description", message: "Description, optional (描述,可选):", default: preset.description },
    ]);

    const accountData = {
        type: preset.type || "Claude",
        apiKey: apiKey.trim(),
        apiUrl: apiUrl.trim(),
        email: email.trim(),
        description: description.trim(),
        customEnv: { ...preset.customEnv },
        modelGroups,
        activeModelGroup,
    };

    config.addAccount(name, accountData);
    console.log(chalk.green(`\n✓ Account '${name}' added from ${preset.name} preset!`));
    console.log(chalk.cyan(`✓ Active model group (活动模型组): ${activeModelGroup}\n`));
    console.log(chalk.cyan(`💡 Tip (提示): 使用 "ais model add" / "ais model use" / "ais model list" 管理模型组;使用 "ais use ${name}" 切换到此账号。\n`));
}

module.exports = {
    addAccount,
    addAccountFromPreset,
    listAccounts,
    useAccount,
    showInfo,
    removeAccount,
    showCurrent,
    exportAccount,
};
