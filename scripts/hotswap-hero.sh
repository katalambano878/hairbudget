#!/bin/bash
set -euo pipefail
CID=$(sudo docker ps -q --filter name=zlwdtqkco75bqzyqpmougl8i | head -1)
echo "CID=$CID"
for f in hero_about.jpg hero_shop.jpg hero_contact.jpg hero_collection_braids.jpg; do
  sudo docker cp "/tmp/$f" "$CID:/app/public/$f"
  sudo docker exec "$CID" ls -l "/app/public/$f"
done
echo '==== STAGING HEADERS ===='
base='https://hairbudget-staging.169-58-8-203.sslip.io'
for f in hero_about.jpg hero_shop.jpg hero_contact.jpg hero_collection_braids.jpg; do
  curl -skI --max-time 15 "$base/$f" | tr -d '\r' | grep -i content-length
done
