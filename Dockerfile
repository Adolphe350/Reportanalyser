FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files from current directory to /app in container
COPY . .

# Make our startup script executable
RUN chmod +x start.sh

# List directory contents for debugging
RUN ls -la /app

# Set environment variable for port
ENV PORT=9000
# Expose the port
EXPOSE 9000

# Start the application using our debug script
CMD ["./start.sh"] 