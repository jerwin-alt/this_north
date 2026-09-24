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

# ─── Seed the volume on first startup ONLY if the volume is empty ───
if [ -d /var/www/html/storage-seed ]; then
    if [ -z "$(ls -A /var/www/html/storage/app/public 2>/dev/null)" ]; then
        echo "Volume is empty — seeding from baked-in files..."
        cp -rn /var/www/html/storage-seed/* /var/www/html/storage/app/public/ 2>/dev/null || true
        echo "Seed copy complete."
    else
        echo "Volume already has files — skipping seed."
    fi
fi
# ─── end seed block ───

# Ensure storage symlink exists (idempotent)
php artisan storage:link --force 2>/dev/null || true

# Clear any stale config cache (safe, non-fatal)
php artisan config:clear || true

# Run migrations, but DO NOT block startup if they fail.
echo "Running migrations..."
php artisan migrate --force || echo "⚠️  Migration failed — continuing anyway"

echo "Starting Laravel HTTP server on 0.0.0.0:${PORT:-8080}"
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"