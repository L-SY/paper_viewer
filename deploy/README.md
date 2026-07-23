# PaperViewer ECS deployment

The production site runs on Ubuntu 22.04 behind Nginx. Next.js listens only on
`127.0.0.1:3000`; Nginx exposes ports 80 and 443.

## Server layout

- Application: `/opt/paperviewer/current`
- Environment: `/opt/paperviewer/current/.env.local` (mode `600`, never commit it)
- Service: `/etc/systemd/system/paperviewer.service`
- Nginx site: `/etc/nginx/sites-available/paperviewer`
- TLS certificate: `/etc/letsencrypt/live/paperviewer.xyz`

## Health checks

```bash
systemctl status paperviewer nginx
curl -I http://127.0.0.1:3000/login
certbot renew --dry-run --no-random-sleep-on-renew
```

## Runtime update

Upload `package.json`, `package-lock.json`, `paperviewer.service`,
`paperviewer.nginx`, and `update-runtime.sh` to the corresponding `/tmp`
filenames used by the script, then run:

```bash
chmod 700 /tmp/update-runtime.sh
/tmp/update-runtime.sh
```

The update script installs dependencies, builds the production bundle, removes
development dependencies, checks the production dependency audit, and restarts
the service.

SSH password login is disabled. Keep the private key backed up securely and do
not place it in this repository.
