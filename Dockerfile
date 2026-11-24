# ==============================================================================
# Production Dockerfile for IT-Start Bot & Web Service on Koyeb
# Platform: Koyeb Nano (512MB RAM, always-on free instance)
# Architecture: Multi-stage Node.js build with dumb-init signal handling
# ==============================================================================

# --- Stage 1: Build frontend assets ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cached when package*.json hasn't changed)
COPY package*.json ./
RUN npm ci

# Copy configuration and source files
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Build production Vite bundle to /app/dist
RUN npm run build

# --- Stage 2: Production runtime ---
FROM node:20-alpine AS runner

# dumb-init forwards signals (SIGTERM, SIGINT) cleanly to Node.js
# curl is used for healthcheck probes
RUN apk add --no-cache dumb-init curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# Install production dependencies only to fit strictly within 512MB RAM
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy pre-built frontend distribution from builder
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy bot server and parser files
COPY --chown=node:node bot ./bot

# Expose HTTP port for Koyeb web routing (default 8000)
EXPOSE 8000

# Container health check probe for Koyeb / Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Run with non-privileged user for enhanced container security
USER node

# Forward signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Launch Telegram bot, VK bot, and HTTP Health Check API
CMD ["node", "bot/bot.mjs", "--all"]
