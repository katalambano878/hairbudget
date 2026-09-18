#!/bin/bash
set -euo pipefail
echo '====HTTP===='
curl -sk -o /dev/null -w '%{http_code}\n' https://hairbudget-staging.169-58-8-203.sslip.io/ || true
echo '====QUEUE===='
echo "SELECT deployment_uuid, status, created_at, updated_at FROM application_deployment_queues WHERE application_id='77' ORDER BY id DESC LIMIT 5;" | sudo docker exec -i coolify-db psql -U coolify -d coolify
echo '====CONTAINERS===='
sudo docker ps -a --format '{{.Names}} {{.Status}}' | grep -E 'zlwdt|hairbudget' || true
