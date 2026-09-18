#!/bin/bash
set -euo pipefail
base='https://hairbudget-staging.169-58-8-203.sslip.io'
echo '====LOGIN FORM===='
curl -sk --max-time 20 "${base}/admin/login" | grep -c -E 'type="password"|info@|Sign in|Log in|email' || true
echo '====AUTH ME===='
curl -sk -o /tmp/hb-auth.json -w '%{http_code}\n' --max-time 20 "${base}/api/auth/user"
head -c 200 /tmp/hb-auth.json; echo
echo '====SHOP BODY===='
curl -sk --max-time 20 "${base}/shop" | grep -c -E 'product|Wig|collection|Add to cart|No products' || true
