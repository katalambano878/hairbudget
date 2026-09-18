#!/bin/bash
# The schema was created by the superuser, so store_hairbudget had no table rights.
# Grant them (plus defaults for future migrations) and finish the Coolify env sync.
set -uo pipefail

echo "==== 1. grant privileges ===="
sudo docker exec -i fleet-postgres psql -U postgres -d store_hairbudget -v ON_ERROR_STOP=1 <<'SQL'
ALTER SCHEMA public OWNER TO store_hairbudget;
GRANT USAGE, CREATE ON SCHEMA public TO store_hairbudget;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO store_hairbudget;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO store_hairbudget;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO store_hairbudget;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO store_hairbudget;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO store_hairbudget;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO store_hairbudget;
SQL
echo "grant exit: $?"

echo "==== 2. verify real query as app role via pgbouncer ===="
PASS=$(sudo grep '^STORE_PASS=' /data/fleet/secrets/store_hairbudget.env | cut -d= -f2-)
sudo docker run --rm --network coolify -e PGPASSWORD="$PASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U store_hairbudget -d store_hairbudget -tAc \
  "select 'products=' || (select count(*) from public.products)
       || ' categories=' || (select count(*) from public.categories)
       || ' users=' || (select count(*) from public.users)
       || ' visible_tables=' || (select count(*) from information_schema.tables where table_schema='public');" 2>&1 | tail -3

echo "==== 3. push new DATABASE_URL into Coolify ===="
printf '%s' "$PASS" | sudo tee /tmp/hb-newpass.txt >/dev/null
sudo docker cp /tmp/hb-newpass.txt coolify:/tmp/hb-newpass.txt
sudo docker cp /tmp/update-hb-dburl.php coolify:/tmp/update-hb-dburl.php
sudo docker exec -u root coolify chmod 644 /tmp/hb-newpass.txt /tmp/update-hb-dburl.php
echo 'require "/tmp/update-hb-dburl.php";' | sudo docker exec -i coolify php artisan tinker 2>&1 | tail -10

echo "==== 4. cleanup ===="
sudo docker exec -u root coolify rm -f /tmp/hb-newpass.txt /tmp/update-hb-dburl.php
sudo rm -f /tmp/hb-newpass.txt
echo done
