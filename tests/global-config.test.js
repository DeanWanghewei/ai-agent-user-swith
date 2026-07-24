const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const GlobalConfigManager = require('../src/config/global-config');

const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-home-'));
process.env.HOME = fakeHome;
process.env.USERPROFILE = fakeHome;

const g = new GlobalConfigManager();
assert.strictEqual(g.getMigrationVersion(), null, 'default version is null');
g.setMigrationVersion('1.13.0');
assert.strictEqual(g.getMigrationVersion(), '1.13.0', 'version round-trips');
const cfg = g.read();
assert.ok(cfg.accounts, 'accounts intact');
assert.strictEqual(typeof cfg.nextAccountId, 'number');

console.log('global-config.test.js OK');
