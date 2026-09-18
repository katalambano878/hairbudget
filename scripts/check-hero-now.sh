#!/bin/bash
set -euo pipefail
base='https://hairbudget-staging.169-58-8-203.sslip.io'
for f in hero_about.jpg hero_shop.jpg hero_contact.jpg hero_collection_braids.jpg; do
  echo "==== $f ===="
  curl -skI --max-time 15 "$base/$f" | tr -d '\r' | grep -iE 'HTTP/|content-length|last-modified|etag'
done
CID=$(sudo docker ps -q --filter name=zlwdtqkco75bqzyqpmougl8i | head -1)
if [ -n "$CID" ]; then
  echo "==== CONTAINER ===="
  sudo docker exec "$CID" ls -l /app/public/hero_about.jpg /app/public/hero_shop.jpg /app/public/hero_contact.jpg /app/public/hero_collection_braids.jpg 2>/dev/null || true
fi
