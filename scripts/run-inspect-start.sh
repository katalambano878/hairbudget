#!/bin/bash
set -euo pipefail
sudo docker cp /tmp/inspect-start-cmd.php coolify:/tmp/inspect-start-cmd.php
echo 'require "/tmp/inspect-start-cmd.php";' | sudo docker exec -i coolify php artisan tinker
