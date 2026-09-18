#!/bin/bash
set -euo pipefail
base='https://hairbudget-staging.169-58-8-203.sslip.io'
for path in / /shop /admin/login /about /cart; do
  code=$(curl -sk -o /tmp/hb-page.html -w '%{http_code}' --max-time 30 "${base}${path}")
  title=$(grep -o '<title>[^<]*</title>' /tmp/hb-page.html | head -1)
  echo "${code} ${path} ${title}"
done
echo '====LOGS===='
CID=$(sudo docker ps -q --filter name=zlwdtqkco75bqzyqpmougl8i | head -1)
sudo docker logs --tail 30 "$CID" 2>&1 | tail -30
echo '====APP===='
sudo fleet app hairbudget-staging
