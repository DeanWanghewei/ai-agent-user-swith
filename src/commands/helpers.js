const chalk = require('chalk');

/**
 * Utility function to mask API key
 * 遮罩 API key，只显示前4位和后4位
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '****';
  return `${apiKey.substring(0, 4)}****${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Validate account by testing API key
 * 验证账号的 API key 是否有效
 */
async function validateAccount(apiKey, apiUrl) {
  // TODO: Implement actual API validation
  // This is a placeholder for future implementation
  try {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 100);
    });
  } catch (error) {
    console.error(chalk.red('Validation error:', error.message));
    return false;
  }
}

module.exports = {
  maskApiKey,
  validateAccount
};
