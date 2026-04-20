# Use Node.js 20 Alpine for better-sqlite3 compatibility
FROM node:20-alpine

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (init fake git for prepare script)
RUN git init && git config core.hooksPath .githooks && npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
  })"

# Start application
CMD ["npm", "start"]