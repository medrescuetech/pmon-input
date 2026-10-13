'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');
const {once} = require('events');
const crypto = require('crypto');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'pagermon-smoke-'));
const password = crypto.randomBytes(24).toString('hex');
const key = crypto.randomBytes(32).toString('hex');
const port = 38651;
const base = `http://127.0.0.1:${port}`;
let child, logs = '';
async function start(first) {
 child = spawn(process.execPath, ['start.js'], {cwd: path.join(__dirname, '..'), env: {...process.env, PORT:String(port), PAGERMON_DATA_DIR:data, PAGERMON_ADMIN_PASSWORD:first ? password : '', PAGERMON_API_KEY:first ? key : ''}, stdio:['ignore','pipe','pipe']});
 child.stdout.on('data', d => {logs += d;}); child.stderr.on('data', d => {logs += d;});
 for(let i=0;i<120;i++) {
  if(child.exitCode !== null) throw new Error(logs);
  try {if((await fetch(base+'/health')).status===200) return;} catch {}
  await new Promise(r => setTimeout(r,250));
 }
 throw new Error('Startup timeout: '+logs);
}
async function stop() {if(child && child.exitCode===null) {const done=once(child,'exit');child.kill('SIGTERM');await done;}}
(async()=>{
 try {
  await start(true);
  assert.equal((await fetch(base)).status,200);
  for(const f of ['config.json','messages.db','sessions.db']) assert.equal((await fetch(base+'/assets/pagermon-private/'+f)).status,404);
  assert.equal((await fetch(base+'/api/messages')).status,401);
  assert.equal((await fetch(base+'/api/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address:'1234567',message:'unauthorized'})})).status,401);
  const response = await fetch(base+'/api/messages',{method:'POST',headers:{'content-type':'application/json',apikey:key},body:JSON.stringify({address:'1234567',message:'GoDaddy smoke check',source:'smoke'})});
  assert.equal(response.status,200,await response.text());
  const login=await fetch(base+'/auth/login',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'admin',password})});
  assert.equal(login.status,200); assert.equal((await login.json()).status,'ok');
  const cookie=login.headers.get('set-cookie');assert(cookie);
  assert.equal((await fetch(base+'/admin',{redirect:'manual',headers:{cookie:cookie.split(';')[0]}})).status,200);
  const config=fs.readFileSync(path.join(data,'config.json'),'utf8');
  await stop();await start(false);
  assert.equal(fs.readFileSync(path.join(data,'config.json'),'utf8'),config);
  const messages=await (await fetch(base+'/api/messages',{headers:{apikey:key}})).json();
  assert(messages.messages.some(m=>m.message==='GoDaddy smoke check'));
  assert.equal((await fetch(base+'/admin',{redirect:'manual',headers:{cookie:cookie.split(';')[0]}})).status,200);
  console.log('PASS: migrations, health, UI, private-data denial, API authentication, ingestion, admin login, message/config/session persistence after restart');
 } finally {await stop();if(process.env.KEEP_SMOKE_DATA) console.log('Test data:',data); else fs.rmSync(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e); console.error(logs); process.exitCode=1;});
