#!/usr/bin/env bash
# Buduje aplikację i wysyła ją na serwer (sajt.com.pl). Adres serwera można nadpisać: SERWER=user@host ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
SERWER=${SERWER:-root@sajt.com.pl}
npm test
npm run build
ssh "$SERWER" 'rm -rf /var/www/sajt.new && mkdir -p /var/www/sajt.new'
scp -rq dist/. "$SERWER":/var/www/sajt.new/
ssh "$SERWER" 'rm -rf /var/www/sajt.old; if [ -d /var/www/sajt ]; then mv /var/www/sajt /var/www/sajt.old; fi; mv /var/www/sajt.new /var/www/sajt && chown -R www-data:www-data /var/www/sajt'
echo "Wdrożono: https://sajt.com.pl"
