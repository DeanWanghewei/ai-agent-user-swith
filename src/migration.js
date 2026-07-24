/**
 * One-time, opt-in upgrade migration (design §8.2, option B).
 * Non-interactive / non-TTY: does nothing.
 * Interactive + version bump: scans Claude accounts and offers to retrofit
 * CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS (always) and preset model groups
 * (only when apiUrl matches a preset AND the account has no modelGroups).
 */
const chalk = require('chalk');
const inquirer = require('inquirer');
const ConfigManager = require('./config');
const { PRESETS } = require('./presets');

const BETAS = 'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS';

function findMigrationCandidates(accounts, presets) {
  const needsBetas = [];
  const presetMatch = [];
  Object.entries(accounts || {}).forEach(([name, acc]) => {
    if (!acc || acc.type !== 'Claude') return;
    const hasBetas = !!(acc.customEnv && acc.customEnv[BETAS]);
    if (!hasBetas) needsBetas.push(name);
    if (acc.apiUrl) {
      const preset = presets.find((p) => p.apiUrl === acc.apiUrl);
      if (preset) {
        const hasGroups = !!(acc.modelGroups && Object.keys(acc.modelGroups).length > 0);
        if (!hasGroups) presetMatch.push({ name, preset });
      }
    }
  });
  return { needsBetas, presetMatch };
}

function applyBetas(config, name) {
  const acc = config.getAccount(name);
  if (!acc) return false;
  acc.customEnv = { ...(acc.customEnv || {}) };
  if (acc.customEnv[BETAS]) return false;
  acc.customEnv[BETAS] = '1';
  config.addAccount(name, acc);
  return true;
}

function applyPresetGroups(config, name, preset) {
  const acc = config.getAccount(name);
  if (!acc) return false;
  if (acc.modelGroups && Object.keys(acc.modelGroups).length > 0) return false;
  acc.modelGroups = {
    latest: { ...preset.modelGroups.latest.config },
    balanced: { ...preset.modelGroups.balanced.config },
  };
  acc.activeModelGroup = preset.defaultActiveGroup;
  config.addAccount(name, acc);
  return true;
}

async function maybeRunMigration() {
  if (!process.stdout.isTTY) return; // never prompt / never silently modify

  const config = new ConfigManager();
  const currentVersion = require('../package.json').version;
  const last = config.globalConfig.getMigrationVersion();
  if (last && last === currentVersion) return;

  const accounts = config.getAllAccounts();
  const { needsBetas, presetMatch } = findMigrationCandidates(accounts, PRESETS);

  const totalCandidates = new Set([...needsBetas, ...presetMatch.map((m) => m.name)]).size;
  if (totalCandidates === 0) {
    config.globalConfig.setMigrationVersion(currentVersion);
    return;
  }

  console.log(chalk.bold.cyan('\n🔄 升级迁移检查 (Upgrade migration)'));
  console.log(chalk.gray(`检测到 ${totalCandidates} 个 Claude 账号可补充推荐配置(非破坏、只加不删)。`));
  if (needsBetas.length) console.log(chalk.gray(`   • 补充 ${BETAS}=1: ${needsBetas.join(', ')}`));
  presetMatch.forEach((m) => console.log(chalk.gray(`   • 套用预设模型组 (${m.preset.name}): ${m.name}`)));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '是否补充?',
      choices: [
        { name: '全部补充 Apply all', value: 'all' },
        { name: '逐个选择 Choose', value: 'choose' },
        { name: '跳过 Skip', value: 'skip' },
      ],
      default: 'skip',
    },
  ]);

  if (action === 'skip') {
    config.globalConfig.setMigrationVersion(currentVersion);
    console.log(chalk.yellow('已跳过 (skipped)。'));
    return;
  }

  for (const name of needsBetas) {
    if (action === 'all' || (await confirmSingle(name, '补充 BETAS'))) {
      applyBetas(config, name);
      console.log(chalk.green(`✓ ${name}: +${BETAS}=1`));
    }
  }
  for (const m of presetMatch) {
    if (action === 'all' || (await confirmSingle(m.name, `套用 ${m.preset.name} 预设模型组`))) {
      applyPresetGroups(config, m.name, m.preset);
      console.log(chalk.green(`✓ ${m.name}: 套用 ${m.preset.name} 模型组`));
    }
  }

  config.globalConfig.setMigrationVersion(currentVersion);
  console.log(chalk.green('迁移完成 (migration done)。\n'));
}

async function confirmSingle(name, label) {
  const { ok } = await inquirer.prompt([
    { type: 'confirm', name: 'ok', message: `${name} — ${label}?`, default: false },
  ]);
  return ok;
}

module.exports = { findMigrationCandidates, applyBetas, applyPresetGroups, maybeRunMigration };
