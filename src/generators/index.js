/**
 * Generator Factory
 * Creates appropriate generator based on account type
 */
const ClaudeGenerator = require('./claude-generator');
const CodexGenerator = require('./codex-generator');
const CCRGenerator = require('./ccr-generator');
const DroidsGenerator = require('./droids-generator');
const { ACCOUNT_TYPES } = require('../constants');

function createGenerator(accountType, projectRoot) {
  const generators = {
    [ACCOUNT_TYPES.CLAUDE]: ClaudeGenerator,
    [ACCOUNT_TYPES.CODEX]: CodexGenerator,
    [ACCOUNT_TYPES.CCR]: CCRGenerator,
    [ACCOUNT_TYPES.DROIDS]: DroidsGenerator
  };

  const GeneratorClass = generators[accountType] || ClaudeGenerator;
  return new GeneratorClass(projectRoot);
}

module.exports = {
  createGenerator,
  ClaudeGenerator,
  CodexGenerator,
  CCRGenerator,
  DroidsGenerator
};
