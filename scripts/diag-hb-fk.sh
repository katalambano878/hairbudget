#!/bin/bash
set -uo pipefail
DB=store_hairbudget

echo "==== products columns referencing category ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -tAc \
  "select column_name, data_type, is_nullable from information_schema.columns
   where table_schema='public' and table_name='products' and column_name like '%categor%';"

echo "==== ALL foreign keys in public ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -tAc \
  "select tc.table_name || '.' || kcu.column_name || ' -> ' || ccu.table_name || '.' || ccu.column_name
   from information_schema.table_constraints tc
   join information_schema.key_column_usage kcu
     on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
   join information_schema.constraint_column_usage ccu
     on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
   where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public'
   order by 1;"

echo "==== FK count ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -tAc \
  "select count(*) from information_schema.table_constraints
   where constraint_type='FOREIGN KEY' and table_schema='public';"
