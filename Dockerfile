# Multi-stage build for production
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY drizzle.config.ts ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install system dependencies for production including network tools
RUN apk add --no-cache \
    dumb-init \
    curl \
    nmap \
    iputils \
    net-tools \
    procps

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S skylink -u 1001

WORKDIR /app

# Copy built application
COPY --from=build --chown=skylink:nodejs /app/dist ./dist
COPY --from=build --chown=skylink:nodejs /app/package*.json ./
COPY --from=build --chown=skylink:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=skylink:nodejs /app/drizzle.config.ts ./
COPY --from=build --chown=skylink:nodejs /app/shared ./shared

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-5000}/api/system/health || exit 1

USER skylink
EXPOSE 5000
EXPOSE 8080

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]