FROM node:18-alpine

# Install networking and diagnostic tools
RUN apk add --no-cache busybox-extras curl net-tools netcat-openbsd iputils

# Create app directory outside of /app to avoid Coolify's volume mount
WORKDIR /simple-app

# Copy source files from the repository
COPY ./public ./public
COPY ./server.js ./server.js
COPY ./docker-compose.production.yml ./docker-compose.production.yml

# Log directory contents for debugging
RUN echo "Files in working directory:" && ls -la && \
    echo "Files in public directory:" && ls -la public

# Create a more robust healthcheck script
RUN echo '#!/bin/sh' > healthcheck.sh && \
    echo 'echo "Running healthcheck..."' >> healthcheck.sh && \
    echo 'echo "Network status:"' >> healthcheck.sh && \
    echo 'netstat -tulpn | grep 9000 || echo "Port 9000 not found in netstat"' >> healthcheck.sh && \
    echo 'curl -s http://localhost:9000/health && echo "" || echo "Health check failed"' >> healthcheck.sh && \
    chmod +x healthcheck.sh

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production
# Set Node.js memory limit
ENV NODE_OPTIONS="--max-old-space-size=128"

# Expose the port
EXPOSE 9000

# Set up healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD ./healthcheck.sh

# Start the server with optimized settings
CMD ["node", "--trace-warnings", "--unhandled-rejections=strict", "server.js"] 