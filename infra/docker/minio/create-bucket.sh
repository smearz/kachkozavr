#!/bin/sh
set -e

echo "Waiting for MinIO..."
until mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
  sleep 1
done

echo "Ensuring bucket exists: ${S3_BUCKET}"
mc mb --ignore-existing "local/${S3_BUCKET}"

echo "Bucket init complete."
