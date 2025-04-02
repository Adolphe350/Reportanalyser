FROM node:18-alpine

# Install networking and diagnostic tools
RUN apk add --no-cache busybox-extras curl net-tools netcat-openbsd iputils

# Create app directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Move HTML files to public directory if they're in root
RUN mkdir -p public && \
    if [ -f "./index.html" ]; then mv ./index.html ./public/; fi && \
    if [ -f "./dashboard.html" ]; then mv ./dashboard.html ./public/; fi

# Create uploads directory
RUN mkdir -p uploads && chmod 777 uploads

# Log directory contents for debugging
RUN echo "Files in working directory:" && ls -la && \
    echo "Files in public directory:" && ls -la public

# Create a healthcheck script
RUN echo '#!/bin/sh' > healthcheck.sh && \
    echo 'curl -f http://localhost:9000/health || exit 1' >> healthcheck.sh && \
    chmod +x healthcheck.sh

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Expose the port
EXPOSE 9000

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD ./healthcheck.sh

# Start the server
CMD ["npm", "start"] 