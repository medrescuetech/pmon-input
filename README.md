# PagerMon for GoDaddy Node.js Hosting

This branch packages upstream [pagermon/pagermon](https://github.com/pagermon/pagermon) 0.3.13-beta as one root-level Node.js app. It is separate from pmon-input on the repository's main branch. Upstream's Unlicense is retained in LICENSE.

## Install using GitHub

1. In GoDaddy **Node.js Hosting**, choose **Connect GitHub**.
2. Select repository **medrescuetech/pmon-input**, branch **godaddy-pagermon**.
3. Select **I need to add secrets for my app to boot**. Add:

| Secret | Value |
| --- | --- |
| `PAGERMON_ADMIN_PASSWORD` | Your chosen strong password, at least 12 characters |
| `PAGERMON_API_KEY` | Your chosen random key, at least 32 characters |
| `PAGERMON_ADMIN_USER` | Optional; defaults to `admin` |

4. Select **Import & Deploy**. GoDaddy installs dependencies, runs `npm run build`, then `npm start`.
5. Open the preview URL. Sign in as `admin` (or your chosen username) using the password you set.
6. Check `/health`: it should return `{"status":"ok"}`.
7. Before publishing, request `/assets/pagermon-private/config.json`, `/assets/pagermon-private/messages.db` and `/assets/pagermon-private/sessions.db`. Each must return **404**. The app denies the entire `/assets` URL prefix. Do not publish if a hosting-level static handler bypasses that denial; use a private persistent volume through `PAGERMON_DATA_DIR` instead.
8. Publish when the preview checks pass. Set/check these secrets for production too if GoDaddy separates preview and live secrets.

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
# Set PAGERMON_ADMIN_PASSWORD and PAGERMON_API_KEY in your environment first.
npm start
```

`PORT` is supplied by GoDaddy (defaults to 3000 locally), listening on `0.0.0.0`. `TRUST_PROXY_HOPS` defaults to 1; adjust only to match the actual proxy chain. Secure cookies follow the forwarded HTTPS scheme.

This is a hosting compatibility port of legacy PagerMon, not a complete dependency/security modernization. Validate live HTTPS, static-data blocking, WebSocket/polling updates, and persistence after a GoDaddy redeployment before moving your receiver. GoDaddy deployment itself has not been tested from this workspace.

## Validation

`npm test` runs an isolated smoke test with temporary credentials and storage. Verified on Node.js 24: database migrations, health, UI, private-data denial, unauthorized API rejection, authenticated ingestion, admin login and configuration/message/session persistence after restart. The test deletes its temporary data on completion.

Upstream source commit: `80197e7626a71df2687ab73d735ec9ab57b5e214`.
