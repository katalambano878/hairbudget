#!/bin/bash
# Diagnose store_hairbudget auth. Never prints secrets.
set -uo pipefail

SECRET=/data/fleet/secrets/store_hairbudget.env
echo "==== secret file ===="
if sudo test -r "$SECRET"; then
  echo "present: yes"
  sudo grep -c 'STORE_PASS=' "$SECRET" | sed 's/^/STORE_PASS lines: /'
else
  echo "present: NO"
fi

STORE_PASS=$(sudo grep '^STORE_PASS=' "$SECRET" | head -1 | cut -d= -f2-)
echo "secret length: ${#STORE_PASS}"

echo "==== direct fleet-postgres:5432 ===="
sudo docker run --rm --network coolify -e PGPASSWORD="$STORE_PASS" postgres:16-alpine \
  psql -h fleet-postgres -p 5432 -U store_hairbudget -d store_hairbudget \
  -c "select current_database(), current_user;" 2>&1 | tail -5

echo "==== via fleet-pgbouncer:6432 ===="
sudo docker run --rm --network coolify -e PGPASSWORD="$STORE_PASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U store_hairbudget -d store_hairbudget \
  -c "select current_database(), current_user;" 2>&1 | tail -5

echo "==== Coolify DATABASE_URL shape (password masked) ===="
CID=$(sudo docker ps -q --filter name=zlwdtqkco75bqzyqpmougl8i | head -1)
sudo docker exec "$CID" printenv DATABASE_URL 2>/dev/null \
  | sed -E 's#(://[^:]+:)[^@]*(@)#\1***MASKED***\2#' || echo "no DATABASE_URL in container"
sudo docker exec "$CID" sh -c 'printenv DATABASE_URL | wc -c' 2>/dev/null | sed 's/^/DATABASE_URL length: /'

echo "==== pgbouncer userlist has store_hairbudget? ===="
sudo docker exec fleet-pgbouncer sh -c 'grep -c store_hairbudget /etc/pgbouncer/userlist.txt 2>/dev/null || echo 0' 2>/dev/null || echo "cannot read userlist"
sudo docker exec fleet-pgbouncer sh -c 'grep -E "^auth_type|auth_query|auth_user" /etc/pgbouncer/pgbouncer.ini 2>/dev/null' 2>/dev/null || true
