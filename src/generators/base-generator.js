/**
 * Base Generator Class
 * Provides common functionality for all configuration generators
 */
const fs = require('fs');
const path = require('path');
const { CONFIG_FILES, DEFAULT_CCR_PORT } = require('../constants');

class BaseGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  /**
   * Ensure a directory exists, create if not
   */
  ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Read and parse a JSON file
   */
  readJsonFile(filePath, defaultValue = {}) {
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  /**
   * Write data to a JSON file
   */
  writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Read auth.json file
   */
  readAuthJson(authJsonFile) {
    if (!fs.existsSync(authJsonFile)) {
      return {};
    }

    try {
      const content = fs.readFileSync(authJsonFile, 'utf8');
      return JSON.parse(content);
    } catch (parseError) {
      const chalk = require('chalk');
      console.warn(
        chalk.yellow(
          `⚠ Warning: Could not parse existing auth.json, will create new file (警告: 无法解析现有 auth.json，将创建新文件)`
        )
      );
      return {};
    }
  }

  /**
   * Write auth.json file atomically with proper permissions
   */
  writeAuthJson(authJsonFile, authData) {
    const tempFile = `${authJsonFile}.tmp.${process.pid}`;

    try {
      // Write to temporary file first (atomic operation)
      fs.writeFileSync(tempFile, JSON.stringify(authData, null, 2), 'utf8');

      // Set file permissions to 600 (owner read/write only) for security
      if (process.platform !== 'win32') {
        fs.chmodSync(tempFile, 0o600);
      }

      // Atomically rename temp file to actual file
      fs.renameSync(tempFile, authJsonFile);
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Get CCR port from config file
   */
  getCcrPort() {
    const ccrConfigFile = path.join(require('os').homedir(), CONFIG_FILES.CCR_DIR, CONFIG_FILES.CCR_CONFIG);
    let port = DEFAULT_CCR_PORT;
    if (fs.existsSync(ccrConfigFile)) {
      try {
        const ccrConfig = JSON.parse(fs.readFileSync(ccrConfigFile, 'utf8'));
        if (ccrConfig.PORT) {
          port = ccrConfig.PORT;
        }
      } catch (e) {
        // Use default port if reading fails
      }
    }
    return port;
  }

  /**
   * Generate configuration - to be implemented by subclasses
   */
  generate(account, options = {}) {
    throw new Error('generate() must be implemented by subclass');
  }
}

module.exports = BaseGenerator;
