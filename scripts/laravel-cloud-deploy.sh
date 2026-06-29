#!/usr/bin/env bash
# TriWheel deploy commands for Laravel Cloud → Environment → Deploy.
# Run after each successful build.

set -euo pipefail

php artisan migrate --force
php artisan storage:link
