#!/bin/bash
set -uo pipefail
DB=store_hairbudget
echo "==== categories columns ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -c "\d+ public.categories" 2>&1 | head -40
echo "==== existing rows ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -c \
  "select id, name, slug, status, position, image_url, metadata from public.categories order by position;" 2>&1 | head -20
echo "==== products count ===="
sudo docker exec fleet-postgres psql -U postgres -d $DB -tAc "select count(*) from public.products;"
