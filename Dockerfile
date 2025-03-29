FROM node:18-alpine

# Create app directory outside of /app to avoid Coolify's volume mount
WORKDIR /simple-app

# Copy source files from the repository
COPY ./public ./public
COPY ./server.js ./server.js

# Log directory contents for debugging
RUN echo "Files in working directory:" && ls -la && \
    echo "Files in public directory:" && ls -la public

# Set environment variables  
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server with increased diagnostic output
CMD ["node", "--trace-warnings", "server.js"] 