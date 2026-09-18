#!/bin/bash
set -euo pipefail
base='https://hairbudget-staging.169-58-8-203.sslip.io'
echo '==== HEAD ===='
curl -skI --max-time 20 "${base}/hero.mp4" | tr -d '\r'
echo '==== RANGE ===='
curl -skI --max-time 20 -H 'Range: bytes=0-1' "${base}/hero.mp4" | tr -d '\r'
echo '==== HOME HAS VIDEO ===='
curl -sk --max-time 20 "${base}/" | grep -o 'hero.mp4\|<video\|poster=' | head
echo '==== FILE IN CONTAINER ===='
CID=$(sudo docker ps -q --filter name=zlwdtqkco75bqzyqpmougl8i | head -1)
sudo docker exec "$CID" ls -l /app/public/hero.mp4 /app/hero.mp4 2>/dev/null || true
sudo docker exec "$CID" find /app -name 'hero.mp4' 2>/dev/null | head
