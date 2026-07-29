#!/usr/bin/env bash
# Encrypted PostgreSQL backup — Part D: "encrypted backups".
#
# Requires: pg_dump (matching the server's major version), gpg with a
# recipient key already imported, and BACKUP_GPG_RECIPIENT set.
#
# This is a template to adapt to your actual managed-Postgres provider —
# most (Render, Railway, Supabase, RDS) also offer automated encrypted
# snapshots natively, which should be enabled as the primary mechanism.
# This script is the fallback/portable path, and a starting point for a
# scheduled job (cron, GitHub Actions scheduled workflow, or your host's
# equivalent) — not itself scheduled by anything in this repo.

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${BACKUP_GPG_RECIPIENT:?BACKUP_GPG_RECIPIENT must be set (gpg key id/email)}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-./backups}"
mkdir -p "$OUTPUT_DIR"

DUMP_FILE="$OUTPUT_DIR/shm-backup-$TIMESTAMP.sql"
ENCRYPTED_FILE="$DUMP_FILE.gpg"

echo "Dumping database..."
pg_dump --no-owner --no-privileges "$DATABASE_URL" > "$DUMP_FILE"

echo "Encrypting backup for recipient $BACKUP_GPG_RECIPIENT..."
gpg --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "$ENCRYPTED_FILE" "$DUMP_FILE"

# Never leave an unencrypted dump on disk once the encrypted copy exists.
rm -f "$DUMP_FILE"

echo "Encrypted backup written to $ENCRYPTED_FILE"
echo "Upload this to your backup storage (S3/R2 with versioning + lifecycle policy) as the next step."
