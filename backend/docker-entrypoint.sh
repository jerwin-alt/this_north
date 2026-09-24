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

# Seed volume from baked-in image on first boot
if [ -d /var/www/html/storage-seed ]; then
    if [ -z "$(ls -A /var/www/html/storage/app/public 2>/dev/null)" ]; then
        echo "Volume empty — seeding from baked-in files..."
        cp -rn /var/www/html/storage-seed/* /var/www/html/storage/app/public/ 2>/dev/null || true
        echo "Seed copy complete."
    else
        echo "Volume already has files — skipping file seed."
    fi
fi

# Storage symlink
php artisan storage:link --force 2>/dev/null || true

# Config cleanup
php artisan config:clear || true

# Migrations
echo "Running migrations..."
php artisan migrate --force || echo "⚠️  Migration failed — continuing anyway"

# Run all seeders (idempotent — safe every boot)
echo "Running database seeders..."
php artisan db:seed --force || echo "⚠️  Seeding failed — continuing anyway"
echo "Seeding complete."

echo "Starting Laravel HTTP server on 0.0.0.0:${PORT:-8080}"
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"