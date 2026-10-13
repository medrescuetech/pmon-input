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
function createConfig(username, password, key) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/default.json')));
  config.global.sessionSecret = crypto.randomBytes(48).toString('hex');
  config.global.loglevel = 'info';
  config.database.file = path.join(data, 'messages.db');
  config.auth.user = username;
  config.auth.encPass = require('bcryptjs').hashSync(password, 12);
  config.auth.keys = [{name: 'receiver', key, selected: true}];
  config.messages.apiSecurity = true;
  fs.writeFileSync(process.env.PAGERMON_CONFIG, JSON.stringify(config, null, 2), {mode: 0o600, flag: 'wx'});
}
async function main() {
 if (!fs.existsSync(process.env.PAGERMON_CONFIG)) {
  const password = process.env.PAGERMON_ADMIN_PASSWORD || '';
  const key = process.env.PAGERMON_API_KEY || '';
  if (password.length >= 12 && Buffer.byteLength(password) <= 72 && key.length >= 32 && key.length <= 256) {
   createConfig(process.env.PAGERMON_ADMIN_USER || 'admin', password, key);
  } else {
   await require('./setup')(createConfig);
  }
 }
const nconf = require('nconf');
nconf.file({file: process.env.PAGERMON_CONFIG});
nconf.load();
const db = require('./knex/knex');
try {
 await db.migrate.latest();
 require('./app');
} catch(error) {
 await db.destroy();
 throw error;
}
}
main().catch(error => {
 console.error('PagerMon startup failed:', error.message);
 process.exit(1);
});
