#!/bin/bash
set -uo pipefail
DB=store_hairbudget

echo "==== applying category seed ===="
sudo docker cp /tmp/categories.sql fleet-postgres:/tmp/categories.sql
sudo docker exec fleet-postgres psql -U postgres -d $DB -v ON_ERROR_STOP=1 -f /tmp/categories.sql 2>&1 | tail -5

echo "==== rows now ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -c \
  "select position, name, slug, status, metadata->>'featured' as featured, image_url from public.categories order by position;"

echo "==== featured count (homepage shows these) ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -tAc \
  "select count(*) from public.categories where status='active' and metadata->>'featured' = 'true';"

echo "==== app role can read them via pgbouncer ===="
PASS=$(sudo grep '^STORE_PASS=' /data/fleet/secrets/store_hairbudget.env | cut -d= -f2-)
sudo docker run --rm --network coolify -e PGPASSWORD="$PASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U store_hairbudget -d $DB -tAc \
  "select string_agg(name, ' | ' order by position) from public.categories where status='active';" 2>&1 | tail -2

sudo docker exec fleet-postgres rm -f /tmp/categories.sql
