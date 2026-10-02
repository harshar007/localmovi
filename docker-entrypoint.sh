#!/bin/sh
set -e
mkdir -p /app/data/database /app/data/cache/thumbnails /app/data/cache/transcode /app/data/logs
exec node dist-server/server/index.js
