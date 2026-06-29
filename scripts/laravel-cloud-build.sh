#!/usr/bin/env bash
# TriWheel monorepo build for Laravel Cloud (API only).
# Paste this into Laravel Cloud → Environment → Build, and disable default npm steps.
# Frontend deploys separately on Vercel (see frontend/.env.example).

set -euo pipefail

mkdir -p /tmp/monorepo

repos=("backend" "frontend" "legacy-php" "docs")
for item in "${repos[@]}"; do
  if [ -d "$item" ]; then
    mv "$item" /tmp/monorepo/
  fi
done

rm -rf composer.lock composer.json README.md .gitignore scripts solo.yml

cp -Rf /tmp/monorepo/backend/. .

composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

php artisan config:cache
php artisan route:cache

rm -rf /tmp/monorepo
