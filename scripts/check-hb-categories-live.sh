#!/bin/bash
set -uo pipefail
base='https://hairbudget-staging.169-58-8-203.sslip.io'

echo "==== deploy status ===="
echo "SELECT deployment_uuid, status FROM application_deployment_queues WHERE application_id='77' ORDER BY id DESC LIMIT 2;" \
  | sudo docker exec -i coolify-db psql -U coolify -d coolify -tA

echo "==== categories API ===="
curl -sk --max-time 25 -o /tmp/cat.json -w 'HTTP %{http_code}\n' "$base/api/storefront/categories"
head -c 600 /tmp/cat.json; echo

echo "==== category images ===="
for f in wigs human-hair human-hair-blends braiding-extensions wig-accessories; do
  printf '%-24s ' "$f.jpg"
  curl -skI --max-time 15 "$base/categories/$f.jpg" | tr -d '\r' | grep -iE '^HTTP/|content-length' | tr '\n' ' '
  echo
done

echo "==== pages ===="
for p in / /categories /shop; do
  printf '%-14s ' "$p"
  curl -sk -o /tmp/p.html --max-time 30 -w '%{http_code}' "$base$p"; echo
done

echo "==== homepage shows category names? ===="
curl -sk --max-time 30 "$base/" | grep -oE 'Wigs|Human Hairs|Human Hair Blends|Braiding Extensions|Wig Accessories' | sort -u
