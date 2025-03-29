FROM node:18-alpine

# Install busybox for troubleshooting
RUN apk add --no-cache busybox-extras

# Create app directory outside of /app to avoid Coolify's volume mount
WORKDIR /simple-app

# Copy source files from the repository
COPY ./public ./public
COPY ./server.js ./server.js

# Log directory contents for debugging
RUN echo "Files in working directory:" && ls -la && \
    echo "Files in public directory:" && ls -la public

# Create a healthcheck script
RUN echo '#!/bin/sh' > healthcheck.sh && \
    echo 'wget -q -O- http://localhost:9000/health || exit 1' >> healthcheck.sh && \
    chmod +x healthcheck.sh

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production
# Set Node.js memory limit without the problematic flag
ENV NODE_OPTIONS="--max-old-space-size=128"

# Expose the port
EXPOSE 9000

# Set up healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD ./healthcheck.sh

# Start the server with optimized settings
CMD ["node", "--trace-warnings", "--unhandled-rejections=strict", "server.js"] 