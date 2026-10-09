#!/usr/bin/env bash
# Jednorazowo: nginx + HTTPS dla sajt.com.pl na serwerze Hetzner, potem wdrożenie aplikacji.
# Nie rusza istniejących stron (zamontujmy, doorfit) — dodaje tylko nowy plik konfiguracji.
set -euo pipefail
cd "$(dirname "$0")/.."
SERWER=${SERWER:-root@sajt.com.pl}
scp -q server/nginx-sajt.conf "$SERWER":/etc/nginx/sites-available/sajt
ssh "$SERWER" 'mkdir -p /var/www/sajt && ln -sf /etc/nginx/sites-available/sajt /etc/nginx/sites-enabled/sajt && nginx -t && systemctl reload nginx'
bash deploy.sh
ssh "$SERWER" 'certbot --nginx -d sajt.com.pl -d www.sajt.com.pl --redirect --non-interactive --agree-tos'
echo "Gotowe: https://sajt.com.pl"
