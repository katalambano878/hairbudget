#!/bin/bash
set -uo pipefail
PASS=$(sudo grep '^STORE_PASS=' /data/fleet/secrets/store_hairbudget.env | cut -d= -f2-)

echo "==== what db does pgbouncer actually give us? ===="
sudo docker run --rm --network coolify -e PGPASSWORD="$PASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U store_hairbudget -d store_hairbudget \
  -tAc "select current_database(), current_user, current_schema();" 2>&1 | tail -3

echo "==== table count both ways ===="
echo -n "pgbouncer: "
sudo docker run --rm --network coolify -e PGPASSWORD="$PASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U store_hairbudget -d store_hairbudget \
  -tAc "select count(*) from pg_tables where schemaname='public';" 2>&1 | tail -1
echo -n "direct:    "
sudo docker run --rm --network coolify -e PGPASSWORD="$PASS" postgres:16-alpine \
  psql -h fleet-postgres -p 5432 -U store_hairbudget -d store_hairbudget \
  -tAc "select count(*) from pg_tables where schemaname='public';" 2>&1 | tail -1

echo "==== sample query through pgbouncer ===="
sudo docker run --rm --network coolify -e PGPASSWORD="$PASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U store_hairbudget -d store_hairbudget \
  -tAc "select count(*) from public.products;" 2>&1 | tail -2

echo "==== pgbouncer SHOW DATABASES (admin) ===="
sudo docker exec fleet-pgbouncer sh -c 'grep -nE "^\[databases\]" -A 20 /etc/pgbouncer/pgbouncer.ini' 2>&1 | head -25
