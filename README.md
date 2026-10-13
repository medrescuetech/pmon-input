# PagerMon for GoDaddy Node.js Hosting

This branch packages upstream [pagermon/pagermon](https://github.com/pagermon/pagermon) 0.3.13-beta as one root-level Node.js app. It is separate from pmon-input on the repository's main branch. Upstream's Unlicense is retained in LICENSE.

## Install using GitHub

1. In GoDaddy **Node.js Hosting**, choose **Connect GitHub**.
2. Select repository **medrescuetech/pmon-input**, branch **godaddy-pagermon**.
3. Select **Import & Deploy**. No secrets are required for browser setup.
4. Open **Runtime Logs** and find `[PagerMon] SETUP CODE:`. Copy the code; it changes when the app restarts and stops working after setup completes.
5. Open the preview URL. Enter the code, choose your admin username/password, and leave the API key blank to generate one (or supply your own). Save the API key shown after setup.
6. Follow the sign-in link after a few seconds. Check `/health`: it should return `{"status":"ok"}`. Before setup, health returns `{"status":"setup_required"}` and the app stays running.
7. Before publishing, request `/assets/pagermon-private/config.json`, `/assets/pagermon-private/messages.db` and `/assets/pagermon-private/sessions.db`. Each must return **404**. The app denies the entire `/assets` URL prefix. Do not publish if a hosting-level static handler bypasses that denial; use a private persistent volume through `PAGERMON_DATA_DIR` instead.
8. Publish when the preview checks pass. If production has separate fresh storage, complete setup there too.

Optional automatic setup: set `PAGERMON_ADMIN_PASSWORD` (12 characters minimum, 72 bytes maximum), `PAGERMON_API_KEY` (32–256 characters), and optionally `PAGERMON_ADMIN_USER` (defaults to `admin`) before the first run. Missing or invalid secrets open browser setup instead of crashing. Existing stored configuration always takes precedence.

If the old version logs “First run requires PAGERMON_ADMIN_PASSWORD”, use **Pull from GitHub** on branch **godaddy-pagermon**, then restart the preview. Confirm Runtime Logs show version **0.3.13-godaddy.2** and a setup code. The earlier Vite/Airo template log entries are not this fatal error: the attached failure occurs later in `node start.js` while validating first-run secrets.

GoDaddy documentation: [app requirements](https://docs.developer.commerce.godaddy.com/en/docs/api-users/hosting/app-requirements), [GitHub import and persistent storage](https://www.godaddy.com/en-au/help/deploy-my-loveable-app-with-godaddy-nodejs-hosting-42981).

## Connect your receiver

Keep your SDR/decoder on your Raspberry Pi or other receiving computer. GoDaddy hosts the web server, not USB radio hardware. Use your HTTPS site URL and the API key above in the existing PagerMon client configuration. The message endpoint is `POST /api/messages` (also `/post/messages`). For example, from a shell where `PAGERMON_API_KEY` is set:

```sh
curl --fail-with-body -X POST 'https://YOUR-SITE/api/messages' \
  -H 'Content-Type: application/json' \
  -H "apikey: $PAGERMON_API_KEY" \
  --data '{"address":"1234567","message":"Receiver connectivity check","source":"test"}'
```

Message retrieval requires login/API authentication by default. Existing PagerMon aliases, users, settings and plugins remain available. Notification plugins are inherited legacy integrations; test each provider before depending on it.

## Storage, updates and backups

The default data directory is `public/assets/pagermon-private`, GoDaddy's documented persistent-assets area. It contains configuration (including API keys), `messages.db`, `sessions.db`, configuration backups and rotating logs. This directory is excluded from GitHub and denied by Express. Preview and production may use separate storage; do not assume preview data migrates to live.

`PAGERMON_DATA_DIR` can override this path with a private persistent directory offered by your hosting plan. Do not choose an ephemeral directory. The process changes its working directory to the app root and uses absolute database paths, avoiding SQLITE_CANTOPEN errors caused by startup locations.

Credentials are used only when creating a fresh configuration/database. Changing an environment password later does not reset an existing account; use the user manager. API keys are managed in PagerMon settings after initial setup.

Use GoDaddy **Pull from GitHub** to update this branch, check the preview, then publish. Do not replace or commit the data directory. Stop the app before copying the full data directory for a consistent SQLite backup. Store backups privately; they contain credentials and message data. To migrate an existing installation, stop both apps and transfer its database and config, preserving this version's absolute database path; back up before any migration.

## Local run

Use Node.js 20, 22 or 24:

```sh
npm ci --omit=dev --omit=optional
npm run build
# Open the local site and use the setup code from the terminal.
npm start
```

`PORT` is supplied by GoDaddy (defaults to 3000 locally), listening on `0.0.0.0`. `TRUST_PROXY_HOPS` defaults to 1; adjust only to match the actual proxy chain. Secure cookies follow the forwarded HTTPS scheme.

This is a hosting compatibility port of legacy PagerMon, not a complete dependency/security modernization. Validate live HTTPS, static-data blocking, WebSocket/polling updates, and persistence after a GoDaddy redeployment before moving your receiver. GoDaddy deployment itself has not been tested from this workspace.

## Validation

`npm test` runs an isolated smoke test with temporary credentials and storage. Verified on Node.js 24: database migrations, health, UI, private-data denial, unauthorized API rejection, authenticated ingestion, admin login and configuration/message/session persistence after restart. Tests cover both environment-secret setup and browser setup, rejection of an incorrect code/weak password, generated API keys, disabling setup after completion and restart without secrets. The tests delete their temporary data on completion.
