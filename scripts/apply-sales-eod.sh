#!/bin/bash
set -uo pipefail
sudo docker cp /tmp/sales_eod.sql fleet-postgres:/tmp/sales_eod.sql
sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -v ON_ERROR_STOP=1 -f /tmp/sales_eod.sql
sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -c "\d public.end_of_day_reports"
sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -c "SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name='coupon_code';"
