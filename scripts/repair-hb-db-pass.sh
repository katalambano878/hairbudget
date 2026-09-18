#!/bin/bash
# Rotate store_hairbudget password so app, secret file and Postgres role agree.
# Uses URL-safe alphanumerics only (the previous value needed URL-encoding, which broke the DSN).
# Never prints the password.
set -uo pipefail

NEWPASS=$(sudo docker exec fleet-postgres sh -c "tr -dc 'A-Za-z0-9' </dev/urandom | head -c 40")
if [ ${#NEWPASS} -ne 40 ]; then
  echo "FAILED to generate password (len=${#NEWPASS})"
  exit 1
fi
echo "generated password length: ${#NEWPASS} (alphanumeric only)"

echo "==== 1. ALTER ROLE ===="
printf '%s' "ALTER ROLE store_hairbudget WITH PASSWORD '$NEWPASS';" \
  | sudo docker exec -i fleet-postgres psql -U postgres -d postgres -q 2>&1 | tail -3
echo "alter exit: $?"

echo "==== 2. verify direct fleet-postgres:5432 ===="
sudo docker run --rm --network coolify -e PGPASSWORD="$NEWPASS" postgres:16-alpine \
  psql -h fleet-postgres -p 5432 -U store_hairbudget -d store_hairbudget \
  -tAc "select 'DIRECT_OK ' || current_database();" 2>&1 | tail -3

echo "==== 3. verify via fleet-pgbouncer:6432 ===="
sudo docker run --rm --network coolify -e PGPASSWORD="$NEWPASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U store_hairbudget -d store_hairbudget \
  -tAc "select 'PGBOUNCER_OK ' || count(*) || ' tables' from information_schema.tables where table_schema='public';" 2>&1 | tail -3

echo "==== 4. update secret file ===="
sudo sh -c "cat > /data/fleet/secrets/store_hairbudget.env" <<EOF
STORE_DB=store_hairbudget
STORE_USER=store_hairbudget
STORE_PASS=$NEWPASS
DATABASE_URL=postgres://store_hairbudget:$NEWPASS@fleet-pgbouncer:6432/store_hairbudget
DIRECT_URL=postgres://store_hairbudget:$NEWPASS@fleet-postgres:5432/store_hairbudget
EOF
sudo chmod 600 /data/fleet/secrets/store_hairbudget.env
echo "secret file rewritten; keys:"
sudo grep -oE '^[A-Z_]+' /data/fleet/secrets/store_hairbudget.env

echo "==== 5. hand password to Coolify updater ===="
printf '%s' "$NEWPASS" | sudo tee /tmp/hb-newpass.txt >/dev/null
sudo chmod 600 /tmp/hb-newpass.txt
sudo docker cp /tmp/hb-newpass.txt coolify:/tmp/hb-newpass.txt
sudo docker cp /tmp/update-hb-dburl.php coolify:/tmp/update-hb-dburl.php
echo 'require "/tmp/update-hb-dburl.php";' | sudo docker exec -i coolify php artisan tinker 2>&1 | tail -12

echo "==== 6. cleanup ===="
sudo docker exec coolify rm -f /tmp/hb-newpass.txt /tmp/update-hb-dburl.php
sudo rm -f /tmp/hb-newpass.txt
echo "done"
