#!/bin/bash
set -uo pipefail
DB=store_hairbudget

echo "==== applying product seed ===="
sudo docker cp /tmp/products.sql fleet-postgres:/tmp/products.sql
sudo docker exec fleet-postgres psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f /tmp/products.sql

echo "==== sample rows ===="
sudo docker exec fleet-postgres psql -U postgres -d "$DB" -c \
  "select p.name, p.price, c.name as category, pi.url
   from public.products p
   join public.categories c on c.id = p.category_id
   join public.product_images pi on pi.product_id = p.id
   order by p.name limit 8;"

echo "==== counts ===="
sudo docker exec fleet-postgres psql -U postgres -d "$DB" -tAc \
  "select (select count(*) from products) || ' products, ' || (select count(*) from product_images) || ' images';"

sudo docker exec fleet-postgres rm -f /tmp/products.sql
