#!/bin/bash
set -uo pipefail
base='https://hairbudget-staging.169-58-8-203.sslip.io'
echo '==== API RESPONSES ===='
for p in /api/storefront/products /api/storefront/categories '/api/storefront/search?q=hair'; do
  echo "--- $p"
  curl -sk --max-time 25 -o /tmp/hb-api.json -w 'HTTP %{http_code}\n' "$base$p"
  head -c 300 /tmp/hb-api.json; echo
done
echo '==== FULL PRODUCTS ERROR FROM LOGS ===='
CID=$(sudo docker ps -q --filter name=zlwdtqkco75bqzyqpmougl8i | head -1)
sudo docker logs --tail 200 "$CID" 2>&1 | grep -A 6 'Products error' | tail -24
