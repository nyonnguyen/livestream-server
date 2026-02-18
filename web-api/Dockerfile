FROM node:18-alpine

# Install build dependencies for better-sqlite3, network utilities, git, and docker cli
RUN apk add --no-cache python3 make g++ util-linux iproute2 git docker-cli

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
