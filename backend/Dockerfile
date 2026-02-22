# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling and ffmpeg for video duration extraction
RUN apk add --no-cache dumb-init ffmpeg

# Install all dependencies (including dev dependencies for seeds)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy source files needed for seeds (before changing user)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/nest-cli.json ./

# Create uploads directory
RUN mkdir -p uploads && chmod 777 uploads

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Change ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 8081

ENV NODE_ENV=production
ENV PORT=8081

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
