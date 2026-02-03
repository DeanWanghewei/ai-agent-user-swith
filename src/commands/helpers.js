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
 * Mask sensitive value for display
 * Shows first 2 chars + fixed 6 stars + last 2 chars for sensitive variables
 * 用于显示敏感环境变量值，前2字符+固定6星号+后2字符
 * @param {string} key - Variable name to check if sensitive
 * @param {string} value - Value to mask
 * @returns {string} Masked value or original value if not sensitive
 */
function maskEnvValue(key, value) {
  if (!key || !value) return value;

  // Check if variable name contains sensitive keywords
  const isSensitive = key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET') || key.includes('PASSWORD');

  if (!isSensitive) {
    return value;
  }

  // For sensitive values, show first 2 + fixed 6 stars + last 2
  const strValue = String(value);
  if (strValue.length <= 4) {
    // If value is too short, show all stars
    return '*'.repeat(strValue.length);
  }

  const firstTwo = strValue.substring(0, 2);
  const lastTwo = strValue.substring(strValue.length - 2);

  return firstTwo + '******' + lastTwo;
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
  maskEnvValue,
  validateAccount
};
