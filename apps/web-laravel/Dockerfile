# syntax=docker/dockerfile:1
# Build from the monorepo root: docker build -f apps/web-laravel/Dockerfile .
#
# This is the first time this exact Dockerfile has been built anywhere —
# the development sandbox that wrote this project's Laravel code has no
# network access to Packagist and could never run `composer install`
# itself (see apps/web-laravel/MIGRATION_LARAVEL.md). Railway's own build
# infrastructure has normal internet access, so this is a genuine, real
# build attempt, not a repeat of that limitation.

FROM php:8.3-cli AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    git unzip libpq-dev libzip-dev zip \
    && docker-php-ext-install pdo pdo_pgsql zip \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /repo/apps/web-laravel

FROM base AS deps
COPY apps/web-laravel/composer.json ./composer.json
RUN composer install --no-dev --no-interaction --no-scripts --no-autoloader --prefer-dist

FROM deps AS build
COPY apps/web-laravel ./
RUN composer dump-autoload --optimize --no-dev

FROM php:8.3-cli AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev ca-certificates \
    && docker-php-ext-install pdo pdo_pgsql \
    && apt-get purge -y --auto-remove libpq-dev \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 1001 --home /home/appuser --shell /bin/sh appuser \
    && mkdir -p /home/appuser
ENV HOME=/home/appuser
WORKDIR /repo/apps/web-laravel

COPY --from=build --chown=appuser:appuser /repo/apps/web-laravel ./
RUN mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache \
    && chown -R appuser:appuser storage bootstrap/cache

USER appuser
EXPOSE 8000
CMD ["sh", "-c", "exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}"]
