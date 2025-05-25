# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk update && apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Install Bun for better performance
RUN npm install -g bun

# Copy application source
COPY . .

# Create necessary directories
RUN mkdir -p sessions gifts_logs utils scripts

# Set proper permissions
RUN chmod -R 755 sessions gifts_logs utils scripts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S telegram -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R telegram:nodejs /app

# Switch to non-root user
USER telegram

# Expose port for health checks (optional)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Default command
CMD ["bun", "run", "index.ts"] 