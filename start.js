'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
process.chdir(__dirname);
const data = path.resolve(process.env.PAGERMON_DATA_DIR || path.join(__dirname, 'public/assets/pagermon-private'));
fs.mkdirSync(path.join(data, 'logs'), {recursive: true, mode: 0o700});
process.env.PAGERMON_DATA_DIR = data;
process.env.PAGERMON_CONFIG = path.join(data, 'config.json');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
if (!fs.existsSync(process.env.PAGERMON_CONFIG)) {
  const password = process.env.PAGERMON_ADMIN_PASSWORD;
  const key = process.env.PAGERMON_API_KEY;
  if (!password || password.length < 12 || !key || key.length < 32) {
    throw new Error('First run requires PAGERMON_ADMIN_PASSWORD (at least 12 characters) and PAGERMON_API_KEY (at least 32 characters). Set these in GoDaddy secrets, then restart.');
  }
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/default.json')));
  config.global.sessionSecret = crypto.randomBytes(48).toString('hex');
  config.global.loglevel = 'info';
  config.database.file = path.join(data, 'messages.db');
  config.auth.user = process.env.PAGERMON_ADMIN_USER || 'admin';
  config.auth.encPass = require('bcryptjs').hashSync(password, 12);
  config.auth.keys = [{name: 'receiver', key, selected: true}];
  config.messages.apiSecurity = true;
  fs.writeFileSync(process.env.PAGERMON_CONFIG, JSON.stringify(config, null, 2), {mode: 0o600, flag: 'wx'});
}
const nconf = require('nconf');
nconf.file({file: process.env.PAGERMON_CONFIG});
nconf.load();
const db = require('./knex/knex');
db.migrate.latest().then(() => require('./app')).catch(error => {
  console.error('PagerMon database startup failed:', error.message);
  db.destroy().finally(() => process.exit(1));
});
