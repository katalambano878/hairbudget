#!/bin/bash
set -euo pipefail
sudo docker cp /tmp/dump-hb-deploy-logs.php coolify:/tmp/dump-hb-deploy-logs.php
echo 'require "/tmp/dump-hb-deploy-logs.php";' | sudo docker exec -i coolify php artisan tinker
