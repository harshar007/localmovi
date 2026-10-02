# ==========================================
# LocalStream Dockerfile
# Self-Hosted LAN Video Streaming Platform
# ==========================================

# 1. Base image with Node.js & system FFmpeg
FROM node:20-bookworm-slim AS base

# Install FFmpeg, FFprobe, and system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Dependencies stage
FROM base AS dependencies

COPY package.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --no-audit --no-fund

# Generate Prisma SQLite Client
RUN npx prisma generate

# 3. Builder stage
FROM dependencies AS builder

COPY . .

# Build Vite frontend assets & compile TypeScript server
RUN npm run build:client
RUN npm run build:server

# 4. Production Runner stage
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV LOCALSTREAM_DATA_DIR=/app/data
ENV DATABASE_URL="file:/app/data/database/localstream.db"

# Create persistent data and media mount directories upfront
RUN mkdir -p /app/data/database \
    /app/data/cache/thumbnails \
    /app/data/cache/transcode \
    /app/data/logs \
    /media \
    /media/local \
    /media/videos \
    /media/d_drive

# Copy built application, entrypoint and dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

# Expose HTTP LAN streaming port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/auth/status || exit 1

# Start LocalStream server via entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
