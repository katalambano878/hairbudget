#!/bin/bash
set -uo pipefail

echo "==== fleet help ===="
sudo fleet --help 2>&1 | head -40
echo
echo "==== fleet db help ===="
sudo fleet db --help 2>&1 | head -30
echo
echo "==== fleet db list ===="
sudo fleet db list 2>&1 | head -30
echo
echo "==== role + db exist? (superuser via container) ===="
sudo docker exec fleet-postgres psql -U postgres -tAc \
  "select rolname, rolcanlogin from pg_roles where rolname like 'store_hairbudget%';" 2>&1 | head
sudo docker exec fleet-postgres psql -U postgres -tAc \
  "select datname from pg_database where datname='store_hairbudget';" 2>&1 | head
echo
echo "==== password hash method for role ===="
sudo docker exec fleet-postgres psql -U postgres -tAc \
  "select rolname, left(rolpassword,14) as hash_kind from pg_authid where rolname='store_hairbudget';" 2>&1 | head
echo
echo "==== table count in store_hairbudget ===="
sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -tAc \
  "select count(*) from information_schema.tables where table_schema='public';" 2>&1 | head
echo
echo "==== pgbouncer.user_lookup present in postgres db? ===="
sudo docker exec fleet-postgres psql -U postgres -d postgres -tAc \
  "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='pgbouncer';" 2>&1 | head
