#!/bin/bash
set -euo pipefail
echo 'require "/tmp/inspect-coolify-nad4u.php";' | sudo docker exec -i coolify php artisan tinker
