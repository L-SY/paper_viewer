#!/usr/bin/env bash
set -euo pipefail

cat > /etc/ssh/sshd_config.d/60-paperviewer-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF

chmod 644 /etc/ssh/sshd_config.d/60-paperviewer-hardening.conf
sshd -t
systemctl reload ssh

cd /opt/paperviewer/current
npm prune --omit=dev >/dev/null
npm audit --omit=dev --json > /tmp/paperviewer-audit.json || true

node <<'NODE'
const fs = require("node:fs");
const audit = JSON.parse(fs.readFileSync("/tmp/paperviewer-audit.json", "utf8"));
console.log(`PRODUCTION_AUDIT=${JSON.stringify(audit.metadata?.vulnerabilities ?? {})}`);
NODE

systemctl restart paperviewer
sleep 2
curl -fsSI http://127.0.0.1:3000/login | head -n 1
