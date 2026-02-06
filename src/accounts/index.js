/**
 * Account Strategy Factory
 * Creates appropriate strategy based on account type
 */
const ClaudeAccountStrategy = require('./claude-account');
const CodexAccountStrategy = require('./codex-account');
const CCRAccountStrategy = require('./ccr-account');
const DroidsAccountStrategy = require('./droids-account');
const { ACCOUNT_TYPES } = require('../constants');

function createAccountStrategy(accountType) {
  const strategies = {
    [ACCOUNT_TYPES.CLAUDE]: ClaudeAccountStrategy,
    [ACCOUNT_TYPES.CODEX]: CodexAccountStrategy,
    [ACCOUNT_TYPES.CCR]: CCRAccountStrategy,
    [ACCOUNT_TYPES.DROIDS]: DroidsAccountStrategy
  };

  const StrategyClass = strategies[accountType] || ClaudeAccountStrategy;
  return new StrategyClass();
}

module.exports = {
  createAccountStrategy,
  ClaudeAccountStrategy,
  CodexAccountStrategy,
  CCRAccountStrategy,
  DroidsAccountStrategy
};
