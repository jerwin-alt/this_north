# backend/Dockerfile
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    mysql-client

# Install PHP extensions (using mysqlnd for MySQL 8 compatibility)
RUN docker-php-ext-install pdo_mysql mysqli mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set the working directory
WORKDIR /var/www/html

# Copy the application code
COPY . .

# Install application dependencies
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# Ensure the storage and bootstrap cache directories are writable
RUN chown -R www-data:www-data storage bootstrap/cache

# Expose the port (Railway will override this with its own PORT variable)
EXPOSE 8080

# Start the application
# The migrate --force command will run every time the container starts.
CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=$PORT