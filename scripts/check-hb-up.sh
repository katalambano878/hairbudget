#!/bin/bash
echo '====HTTP HOME===='
curl -sk -o /tmp/hb-home.html -w '%{http_code}\n' https://hairbudget-staging.169-58-8-203.sslip.io/ || true
echo '====HTTP ADMIN===='
curl -sk -o /tmp/hb-admin.html -w '%{http_code}\n' https://hairbudget-staging.169-58-8-203.sslip.io/admin/login || true
echo '====TITLE===='
grep -o '<title>[^<]*</title>' /tmp/hb-home.html | head -3
echo '====CONTAINER===='
sudo docker ps -a --format '{{.Names}} {{.Status}}' | grep -E 'zlwdt|hairbudget' || true
echo '====LOGS===='
CID=$(sudo docker ps -aq --filter name=zlwdtqkco75bqzyqpmougl8i | head -1)
if [ -n "$CID" ]; then
  sudo docker logs --tail 40 "$CID" 2>&1
fi
echo '====APP===='
sudo fleet app hairbudget-staging
