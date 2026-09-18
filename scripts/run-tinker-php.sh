#!/bin/bash
set -euo pipefail
FILE="$1"
sudo docker cp "$FILE" "coolify:$FILE"
echo "require \"$FILE\";" | sudo docker exec -i coolify php artisan tinker
