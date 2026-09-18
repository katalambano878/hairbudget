#!/bin/bash
set -euo pipefail

SECRETS=/data/fleet/secrets/store_hairbudget.env
JWT_FILE=/tmp/hairbudget-auth-jwt.secret

if ! sudo test -f "$SECRETS"; then
  echo "missing $SECRETS" >&2
  exit 1
fi

if [[ ! -f "$JWT_FILE" ]]; then
  openssl rand -hex 48 > "$JWT_FILE"
  chmod 600 "$JWT_FILE"
fi

# Persist JWT + admin login next to the DB password (host only).
if ! sudo grep -q '^AUTH_JWT_SECRET=' "$SECRETS"; then
  sudo bash -c "echo AUTH_JWT_SECRET=$(cat "$JWT_FILE") >> $SECRETS"
fi
if ! sudo grep -q '^ADMIN_EMAIL=' "$SECRETS"; then
  ADMIN_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)
  sudo bash -c "printf '%s\n' 'ADMIN_EMAIL=info@hairbudgetgh.com' 'ADMIN_PASSWORD=$ADMIN_PASS' >> $SECRETS"
fi

sudo cp "$SECRETS" /tmp/store_hairbudget.env
sudo chmod 600 /tmp/store_hairbudget.env
sudo docker cp /tmp/store_hairbudget.env coolify:/tmp/store_hairbudget.env
sudo docker cp "$JWT_FILE" coolify:/tmp/hairbudget-auth-jwt.secret
sudo docker cp /tmp/create-coolify-hairbudget.php coolify:/tmp/create-coolify-hairbudget.php
sudo docker exec -u root coolify chmod 644 /tmp/store_hairbudget.env /tmp/hairbudget-auth-jwt.secret /tmp/create-coolify-hairbudget.php

echo 'require "/tmp/create-coolify-hairbudget.php";' | sudo docker exec -i coolify php artisan tinker

ADMIN_EMAIL=$(sudo awk -F= '/^ADMIN_EMAIL=/{print substr($0,index($0,"=")+1)}' "$SECRETS")
ADMIN_PASSWORD=$(sudo awk -F= '/^ADMIN_PASSWORD=/{print substr($0,index($0,"=")+1)}' "$SECRETS")
HASH=$(sudo docker exec -e P="$ADMIN_PASSWORD" coolify php -r 'echo password_hash(getenv("P"), PASSWORD_BCRYPT);')
EXISTING=$(sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -tAc "SELECT id FROM public.users WHERE lower(email)=lower('$ADMIN_EMAIL')" | tr -d '[:space:]')
if [[ -n "$EXISTING" ]]; then
  sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -v ON_ERROR_STOP=1 \
    -c "UPDATE public.users SET encrypted_password=\$bcrypt\$${HASH}\$bcrypt\$, updated_at=now() WHERE id='$EXISTING'"
  USER_ID="$EXISTING"
else
  USER_ID=$(sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -tAc \
    "INSERT INTO public.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at) VALUES ('$ADMIN_EMAIL', \$bcrypt\$${HASH}\$bcrypt\$, '{}'::jsonb, now()) RETURNING id" | tr -d '[:space:]')
fi
sudo docker exec fleet-postgres psql -U postgres -d store_hairbudget -v ON_ERROR_STOP=1 \
  -c "INSERT INTO public.profiles (id, email, role) VALUES ('$USER_ID', '$ADMIN_EMAIL', 'admin') ON CONFLICT (id) DO UPDATE SET role='admin', email=EXCLUDED.email"

echo "admin_ready email=$ADMIN_EMAIL"
echo "secrets_file=$SECRETS"
