FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy just the index.js file
COPY index.js .

# Print directory contents to verify file was copied
RUN ls -la

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the app directly with node (no dependencies needed)
CMD ["node", "index.js"] 