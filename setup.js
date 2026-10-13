'use strict';
const crypto = require('crypto');
const express = require('express');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page = body => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PagerMon setup</title><style>body{font:17px system-ui;background:#eef2f6;color:#182635;margin:0;padding:32px}main{max-width:560px;margin:auto;background:white;padding:32px;border-radius:12px}label{display:block;margin:18px 0}input{display:block;width:95%;padding:10px;margin-top:6px;font:inherit}button{padding:12px 20px;background:#175b9b;color:white;border:0;border-radius:6px;font:inherit}code{overflow-wrap:anywhere}small{color:#536273}</style><main>${body}</main></html>`;
module.exports = function setup(createConfig) {
 return new Promise((resolve, reject) => {
  const token = crypto.randomBytes(24).toString('hex');
  let complete = false, failures = 0, windowEnd = Date.now() + 60000;
  const app = express();
  app.use((req,res,next) => {
   res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});
   next();
  });
  app.use(express.urlencoded({extended:false,limit:'8kb'}));
  app.get('/health', (req,res) => res.json({status:'setup_required'}));
  app.get(['/', '/setup'], (req,res) => res.send(page(`<h1>Set up PagerMon</h1><p>Copy the setup code from GoDaddy Runtime Logs, then choose your admin credentials.</p><form method="post" action="/setup"><label>Setup code<input name="token" required autocomplete="off"></label><label>Username<input name="username" value="admin" required maxlength="32" autocomplete="username"></label><label>Password<input type="password" name="password" required minlength="12" maxlength="72" autocomplete="new-password"></label><label>API key (optional)<input name="key" minlength="32" maxlength="256" autocomplete="off"></label><small>Leave the API key blank to generate one. Save the key shown after setup.</small><p><button>Create admin account</button></p></form>`)));
  app.post('/setup', (req,res) => {
   if(complete) return res.status(409).send('Setup already completed.');
   if(Date.now() > windowEnd) {failures=0;windowEnd=Date.now()+60000;}
   if(failures >= 10) return res.status(429).send('Too many attempts. Wait one minute.');
   const supplied = Buffer.from(String(req.body.token || ''));
   const expected = Buffer.from(token);
   if(supplied.length !== expected.length || !crypto.timingSafeEqual(supplied,expected)) {failures++;return res.status(403).send('Incorrect setup code. Check Runtime Logs.');}
   const username = String(req.body.username || 'admin').trim();
   const password = String(req.body.password || '');
   const key = String(req.body.key || '') || crypto.randomBytes(32).toString('hex');
   if(!username || username.length>32 || password.length<12 || Buffer.byteLength(password)>72 || key.length<32 || key.length>256) return res.status(400).send('Use a username up to 32 characters, a password of at least 12 characters (maximum 72 bytes), and an API key of 32–256 characters.');
   try {createConfig(username,password,key);} catch(error) {console.error('Setup could not save configuration:',error.message);return res.status(500).send('Could not save configuration. Check Runtime Logs.');}
   complete=true;
   res.send(page(`<h1>Setup saved</h1><p>Username: <strong>${escape(username)}</strong></p><p>Save your receiver API key:</p><p><code>${escape(key)}</code></p><p>PagerMon is starting. After a few seconds, <a href="/auth/login">sign in</a> using the password you chose.</p>`));
   server.close(error => error ? reject(error) : resolve());
  });
  app.use((req,res) => res.sendStatus(404));
  const server=app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
   console.log('[PagerMon] First-run setup required. Open your site URL.');
   console.log('[PagerMon] SETUP CODE: '+token);
   console.log('[PagerMon] This code expires when setup completes or the app restarts.');
  });
  server.on('error',reject);
 });
};
