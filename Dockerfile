FROM node:18-alpine

# Install networking and diagnostic tools
RUN apk add --no-cache busybox-extras curl net-tools netcat-openbsd iputils

# Create app directory outside of /app to avoid Coolify's volume mount
WORKDIR /simple-app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy source files from the repository with explicit file list for visibility
COPY ./public ./public
COPY ./server.js ./server.js
COPY ./docker-compose.production.yml ./docker-compose.production.yml

# Log directory contents for debugging
RUN echo "Files in working directory:" && ls -la && \
    echo "Files in public directory:" && ls -la public && \
    if [ -f "./public/dashboard.html" ]; then echo "dashboard.html exists"; else echo "WARNING: dashboard.html not found"; fi && \
    if [ -f "./public/index.html" ]; then echo "index.html exists"; else echo "WARNING: index.html not found"; fi

# Create a more comprehensive healthcheck script
RUN echo '#!/bin/sh' > healthcheck.sh && \
    echo 'echo "Running healthcheck..."' >> healthcheck.sh && \
    echo 'echo "Network status:"' >> healthcheck.sh && \
    echo 'netstat -tulpn | grep 9000 || echo "Port 9000 not found in netstat"' >> healthcheck.sh && \
    echo 'echo "Testing server connectivity:"' >> healthcheck.sh && \
    echo 'curl -v -s http://localhost:9000/health && echo "" || echo "Health check failed"' >> healthcheck.sh && \
    echo 'echo "Testing file access:"' >> healthcheck.sh && \
    echo 'curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/ && echo " - Root path"' >> healthcheck.sh && \
    echo 'curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/dashboard.html && echo " - Dashboard"' >> healthcheck.sh && \
    chmod +x healthcheck.sh

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production
# Set Node.js memory limit but remove flags that might cause issues
ENV NODE_OPTIONS="--max-old-space-size=256"

# Expose the port
EXPOSE 9000

# Set up healthcheck with longer timeout
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 CMD ./healthcheck.sh

# Start the server with optimized settings and enable full debugging
CMD ["node", "--trace-warnings", "--unhandled-rejections=strict", "server.js"] 