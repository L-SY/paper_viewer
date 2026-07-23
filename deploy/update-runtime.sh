#!/usr/bin/env bash
set -euo pipefail

install -m 644 /tmp/paperviewer.service /etc/systemd/system/paperviewer.service
if [[ ! -e /etc/nginx/sites-available/paperviewer ]]; then
  install -m 644 /tmp/paperviewer.nginx /etc/nginx/sites-available/paperviewer
fi
ln -sfn /etc/nginx/sites-available/paperviewer /etc/nginx/sites-enabled/paperviewer

install -o paperviewer -g paperviewer -m 644 /tmp/paperviewer.package.json /opt/paperviewer/current/package.json
install -o paperviewer -g paperviewer -m 644 /tmp/paperviewer.package-lock.json /opt/paperviewer/current/package-lock.json

cd /opt/paperviewer/current
sudo -u paperviewer npm ci
sudo -u paperviewer npm run build:ecs
sudo -u paperviewer npm prune --omit=dev
sudo -u paperviewer npm audit --omit=dev --json > /tmp/paperviewer-audit.json

node <<'NODE'
const fs = require("node:fs");
const audit = JSON.parse(fs.readFileSync("/tmp/paperviewer-audit.json", "utf8"));
console.log(`PRODUCTION_AUDIT=${JSON.stringify(audit.metadata?.vulnerabilities ?? {})}`);
NODE

systemctl daemon-reload
nginx -t
systemctl restart paperviewer
systemctl reload nginx
sleep 2
curl -fsSI http://127.0.0.1:3000/login | head -n 1
