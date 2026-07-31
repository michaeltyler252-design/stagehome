#!/bin/sh
set -e

# Real production server setup, replacing php artisan serve (Laravel's
# own documentation explicitly states this built-in server is for local
# development only). Found and fixed after Railway's healthcheck showed
# repeated "service unavailable" — a connection-level failure consistent
# with a single-threaded dev server, not an application error.

mkdir -p /tmp/client_body /tmp/proxy /tmp/fastcgi /tmp/uwsgi /tmp/scgi

# Only substitute ${PORT} — nginx's own $uri/$query_string/$document_root
# etc. must be left untouched, or the config would break.
export PORT="${PORT:-8080}"
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

php-fpm -D
exec nginx -c /etc/nginx/nginx.conf
