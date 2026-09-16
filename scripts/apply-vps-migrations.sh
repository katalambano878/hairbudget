#!/bin/bash
set -euo pipefail
DIR="$HOME/hairbudget-migrations"
for f in $(ls "$DIR"/*.sql | sort); do
  echo "APPLY $(basename "$f")"
  sudo docker exec -i fleet-postgres psql -U postgres -d store_hairbudget -v ON_ERROR_STOP=1 < "$f"
done
echo DONE
sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -c "SELECT count(*) AS tables FROM information_schema.tables WHERE table_schema='public';"
sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -c "SELECT value->>'site_name' AS site FROM site_settings WHERE key='site_identity';"
