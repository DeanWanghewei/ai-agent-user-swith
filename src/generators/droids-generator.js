/**
 * Droids Configuration Generator
 * Generates .droids/config.json
 */
const fs = require('fs');
const path = require('path');
const BaseGenerator = require('./base-generator');
const { CONFIG_FILES } = require('../constants');

class DroidsGenerator extends BaseGenerator {
  constructor(projectRoot) {
    super(projectRoot);
    this.droidsDir = path.join(this.projectRoot, CONFIG_FILES.DROIDS_DIR);
    this.droidsConfigFile = path.join(this.droidsDir, CONFIG_FILES.DROIDS_CONFIG);
  }

  /**
   * Generate Droids configuration in .droids/config.json
   */
  generate(account, options = {}) {
    // Create .droids directory if it doesn't exist
    this.ensureDir(this.droidsDir);

    // Build Droids configuration
    const droidsConfig = {
      apiKey: account.apiKey
    };

    // Add API URL if specified
    if (account.apiUrl) {
      droidsConfig.baseUrl = account.apiUrl;
    }

    // Add model configuration
    if (account.model) {
      droidsConfig.model = account.model;
    }

    // Add custom environment variables as customSettings
    if (account.customEnv && typeof account.customEnv === 'object') {
      droidsConfig.customSettings = account.customEnv;
    }

    // Write Droids configuration
    this.writeJsonFile(this.droidsConfigFile, droidsConfig);
  }
}

module.exports = DroidsGenerator;
