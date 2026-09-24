#!/bin/sh
set -u

echo "──────────────────────────────────────────"
echo "  Laravel container starting"
echo "  PHP version: $(php -v | head -n 1)"
echo "  PORT env var: ${PORT:-<not set>}"
echo "  APP_ENV: ${APP_ENV:-<not set>}"
echo "  DB_HOST: ${DB_HOST:-<not set>}"
echo "  DB_DATABASE: ${DB_DATABASE:-<not set>}"
echo "──────────────────────────────────────────"

# ─── Copy any missing files from the Docker image into the mounted volume ───
# `cp -rn` = copy only if destination file doesn't exist, NEVER overwrite.
# This is safe to run on EVERY boot — existing uploads are preserved.
if [ -d /var/www/html/storage-seed ]; then
    echo "Syncing missing seed files into volume (never overwrites)..."
    mkdir -p /var/www/html/storage/app/public
    cp -rn /var/www/html/storage-seed/* /var/www/html/storage/app/public/ 2>/dev/null || true
    echo "Sync complete."
fi

# Storage symlink
php artisan storage:link --force 2>/dev/null || true

# Config cleanup
php artisan config:clear || true

# Migrations
echo "Running migrations..."
php artisan migrate --force || echo "⚠️  Migration failed — continuing anyway"

# Seeders (all three are idempotent)
echo "Running database seeders..."
php artisan db:seed --force || echo "⚠️  Seeding failed — continuing anyway"
echo "Seeding complete."

echo "Starting Laravel HTTP server on 0.0.0.0:${PORT:-8080}"
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"