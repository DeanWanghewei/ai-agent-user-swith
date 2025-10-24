/**
 * Commands Module - Unified exports
 *
 * This module aggregates and exports all command functions from different
 * modules for easy import in the main application.
 */

const {
  addAccount,
  listAccounts,
  useAccount,
  showInfo,
  removeAccount,
  showCurrent,
  exportAccount
} = require('./account');

const {
  listModelGroups,
  addModelGroup,
  useModelGroup,
  removeModelGroup,
  showModelGroup
} = require('./model');

const {
  showPaths,
  doctor,
  startUI
} = require('./utility');

module.exports = {
  // Account management commands
  addAccount,
  listAccounts,
  useAccount,
  showInfo,
  removeAccount,
  showCurrent,
  exportAccount,

  // Model group management commands
  listModelGroups,
  addModelGroup,
  useModelGroup,
  removeModelGroup,
  showModelGroup,

  // Utility commands
  showPaths,
  doctor,
  startUI
};
