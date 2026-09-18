#!/bin/bash
echo '====DOCKER===='
sudo docker ps -a --format '{{.Names}} {{.Status}}' | head -40
echo '====DEPLOY ROW===='
echo "SELECT deployment_uuid, status, created_at, updated_at FROM application_deployment_queues WHERE application_id='77' ORDER BY id DESC LIMIT 5;" | sudo docker exec -i coolify-db psql -U coolify -d coolify
echo '====COOLIFY LOG===='
sudo docker logs coolify --tail 40 2>&1 | tail -40
