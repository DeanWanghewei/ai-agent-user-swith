/**
 * Codex Configuration Generator
 * Generates ~/.codex/config.toml and handles auth.json
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const BaseGenerator = require('./base-generator');
const { CONFIG_FILES } = require('../constants');

class CodexGenerator extends BaseGenerator {
  constructor(projectRoot) {
    super(projectRoot);
    this.codexConfigDir = path.join(os.homedir(), CONFIG_FILES.CODEX_DIR);
    this.codexConfigFile = path.join(this.codexConfigDir, CONFIG_FILES.CODEX_CONFIG);
    this.authJsonFile = path.join(this.codexConfigDir, CONFIG_FILES.CODEX_AUTH);
  }

  /**
   * Generate Codex profile in global ~/.codex/config.toml
   */
  generate(account, options = {}) {
    const { WIRE_API_MODES, DEFAULT_WIRE_API } = require('../constants');

    // Create .codex directory if it doesn't exist
    this.ensureDir(this.codexConfigDir);

    // Read existing config if it exists
    let existingConfig = '';
    if (fs.existsSync(this.codexConfigFile)) {
      existingConfig = fs.readFileSync(this.codexConfigFile, 'utf8');
    }

    // Generate profile name based on project path
    const projectName = path.basename(this.projectRoot);
    const profileName = `ais_${projectName}`;

    // Build profile configuration
    let profileConfig = `\n# AIS Profile for project: ${this.projectRoot}\n`;
    profileConfig += `[profiles.${profileName}]\n`;

    // For Codex type accounts, use custom provider configuration
    const providerName = `ais_${account.name || 'provider'}`;
    const escapedProviderName = providerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    profileConfig += `model_provider = "${providerName}"\n`;

    // Add model configuration
    if (account.model) {
      profileConfig += `model = "${account.model}"\n`;
    }

    // Smart /v1 path handling
    let baseUrl = account.apiUrl || '';
    if (baseUrl) {
      baseUrl = baseUrl.replace(/\/+$/, '');
      const isDomainOnly = baseUrl.match(/^https?:\/\/[^\/]+$/);
      if (isDomainOnly) {
        baseUrl += '/v1';
      }
    }

    // Remove existing provider if it exists
    const providerPattern = new RegExp(`\\[model_providers\\.${escapedProviderName}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
    existingConfig = existingConfig.replace(providerPattern, '');

    // Add new provider details
    profileConfig += `\n[model_providers.${providerName}]\n`;
    profileConfig += `name = "${providerName}"\n`;

    if (baseUrl) {
      profileConfig += `base_url = "${baseUrl}"\n`;
    }

    // Determine wire_api based on account configuration
    const wireApi = account.wireApi || DEFAULT_WIRE_API;

    if (wireApi === WIRE_API_MODES.CHAT) {
      profileConfig += `wire_api = "${WIRE_API_MODES.CHAT}"\n`;
      profileConfig += `http_headers = { "Authorization" = "Bearer ${account.apiKey}" }\n`;
    } else if (wireApi === WIRE_API_MODES.RESPONSES) {
      profileConfig += `wire_api = "${WIRE_API_MODES.RESPONSES}"\n`;
      profileConfig += `requires_openai_auth = true\n`;
      this.updateCodexAuthJson(account.apiKey);
    } else if (wireApi === WIRE_API_MODES.ENV) {
      profileConfig += `wire_api = "${WIRE_API_MODES.CHAT}"\n`;
      const envKey = account.envKey || 'AIS_USER_API_KEY';
      profileConfig += `env_key = "${envKey}"\n`;
      this.clearCodexAuthJson();
    }

    // Remove all old profiles with the same name
    existingConfig = this._removeProfileFromConfig(existingConfig, profileName);

    // Append new profile
    const newConfig = existingConfig.trimEnd() + '\n' + profileConfig;

    // Write Codex configuration
    fs.writeFileSync(this.codexConfigFile, newConfig, 'utf8');

    // Create a helper script in project directory
    const helperScript = path.join(this.projectRoot, '.codex-profile');
    fs.writeFileSync(helperScript, profileName, 'utf8');

    return { profileName };
  }

  /**
   * Remove a profile from TOML config string
   * @private
   */
  _removeProfileFromConfig(configContent, profileName) {
    const lines = configContent.split('\n');
    const cleanedLines = [];
    let skipUntilNextSection = false;
    const profileSectionHeader = `[profiles.${profileName}]`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine === profileSectionHeader) {
        skipUntilNextSection = true;

        if (cleanedLines.length > 0) {
          const lastLine = cleanedLines[cleanedLines.length - 1].trim();
          if (lastLine.startsWith('# AIS Profile for project:')) {
            cleanedLines.pop();
          }
        }

        while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') {
          cleanedLines.pop();
        }

        continue;
      }

      if (skipUntilNextSection) {
        if (trimmedLine.startsWith('[')) {
          skipUntilNextSection = false;
        } else {
          continue;
        }
      }

      cleanedLines.push(line);
    }

    let result = cleanedLines.join('\n');
    result = result.replace(/\n{3,}/g, '\n\n');

    return result;
  }

  /**
   * Clear OPENAI_API_KEY in ~/.codex/auth.json for chat mode
   */
  clearCodexAuthJson() {
    try {
      this.ensureDir(this.codexConfigDir);
      const authData = this.readAuthJson(this.authJsonFile);
      authData.OPENAI_API_KEY = "";
      this.writeAuthJson(this.authJsonFile, authData);

      console.log(
        chalk.cyan(
          `✓ Cleared OPENAI_API_KEY in auth.json (chat mode) (已清空 auth.json 中的 OPENAI_API_KEY)`
        )
      );
    } catch (error) {
      console.error(
        chalk.yellow(
          `⚠ Warning: Failed to clear auth.json: ${error.message} (警告: 清空 auth.json 失败)`
        )
      );
    }
  }

  /**
   * Update ~/.codex/auth.json with API key for responses mode
   */
  updateCodexAuthJson(apiKey) {
    try {
      this.ensureDir(this.codexConfigDir);
      const authData = this.readAuthJson(this.authJsonFile);
      authData.OPENAI_API_KEY = apiKey;
      this.writeAuthJson(this.authJsonFile, authData);

      console.log(
        chalk.green(
          `✓ Updated auth.json at: ${this.authJsonFile} (已更新 auth.json)`
        )
      );
    } catch (error) {
      console.error(
        chalk.red(
          `✗ Failed to update auth.json: ${error.message} (更新 auth.json 失败)`
        )
      );
      throw error;
    }
  }
}

module.exports = CodexGenerator;
