# backend/Dockerfile
FROM php:8.4-cli-alpine

RUN apk add --no-cache \
    git curl libpng-dev oniguruma-dev libxml2-dev \
    zip unzip mysql-client

RUN docker-php-ext-install pdo_mysql mysqli mbstring exif pcntl bcmath gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

# ── NEW: save uploads as a seed, then recreate the (empty) public folder ──
RUN mv storage/app/public /var/www/html/storage-seed
RUN mkdir -p storage/app/public
# ── end NEW ──

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

RUN chown -R www-data:www-data storage bootstrap/cache
RUN chmod +x docker-entrypoint.sh

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "/var/www/html/docker-entrypoint.sh"]