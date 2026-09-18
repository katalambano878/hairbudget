#!/bin/bash
# Tables were created by the superuser, leaving the app role a non-owner.
# Hand ownership to store_hairbudget so information_schema behaves normally too.
set -uo pipefail
DB=store_hairbudget
ROLE=store_hairbudget

echo "==== before: objects not owned by app role ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -tAc \
  "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   join pg_roles r on r.oid=c.relowner
   where n.nspname='public' and c.relkind in ('r','v','S','m') and r.rolname <> '$ROLE';"

echo "==== reassigning ownership ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -tAc "
select string_agg(format('ALTER %s %I.%I OWNER TO %I;',
         case c.relkind when 'r' then 'TABLE' when 'v' then 'VIEW'
                        when 'S' then 'SEQUENCE' when 'm' then 'MATERIALIZED VIEW' end,
         n.nspname, c.relname, '$ROLE'), ' ')
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','v','S','m');" \
  | sudo docker exec -i fleet-postgres psql -U postgres -d $DB -q 2>&1 | tail -3

echo "==== after: objects not owned by app role (want 0) ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -tAc \
  "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   join pg_roles r on r.oid=c.relowner
   where n.nspname='public' and c.relkind in ('r','v','S','m') and r.rolname <> '$ROLE';"

echo "==== app role can now see FKs via information_schema? ===="
PASS=$(sudo grep '^STORE_PASS=' /data/fleet/secrets/store_hairbudget.env | cut -d= -f2-)
sudo docker run --rm --network coolify -e PGPASSWORD="$PASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U $ROLE -d $DB -tAc \
  "select 'fk_visible=' || count(*) from information_schema.table_constraints
   where constraint_type='FOREIGN KEY' and table_schema='public';" 2>&1 | tail -2

sudo docker run --rm --network coolify -e PGPASSWORD="$PASS" postgres:16-alpine \
  psql -h fleet-pgbouncer -p 6432 -U $ROLE -d $DB -tAc \
  "select 'products_join_ok=' || count(*) from public.products p left join public.categories c on c.id = p.category_id;" 2>&1 | tail -2
