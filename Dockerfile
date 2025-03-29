FROM node:18-alpine

# Create app directory
WORKDIR /app

# Create a minimal package.json to install dependencies (if any were needed)
# Although our current server.js needs no dependencies, this structure is good practice.
RUN echo '{"name":"reportanalyser-minimal","version":"1.0.0","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{}}' > package.json

# Create the server.js file directly using RUN commands
RUN echo 'const http = require("http");' > server.js && \
    echo 'const port = process.env.PORT || 9000;' >> server.js && \
    echo '' >> server.js && \
    echo '// Create a simple HTTP server' >> server.js && \
    echo 'const server = http.createServer((req, res) => {' >> server.js && \
    echo '  // Log the request' >> server.js && \
    echo '  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);' >> server.js && \
    echo '' >> server.js && \
    echo '  // Health check endpoint' >> server.js && \
    echo '  if (req.url === "/api/health") {' >> server.js && \
    echo '    res.writeHead(200, { "Content-Type": "application/json" });' >> server.js && \
    echo '    res.end(JSON.stringify({' >> server.js && \
    echo '      status: "ok",' >> server.js && \
    echo '      time: new Date().toISOString(),' >> server.js && \
    echo '      node: process.version' >> server.js && \
    echo '    }));' >> server.js && \
    echo '    return;' >> server.js && \
    echo '  }' >> server.js && \
    echo '' >> server.js && \
    echo '  // Root endpoint with HTML' >> server.js && \
    echo '  if (req.url === "/") {' >> server.js && \
    echo '    res.writeHead(200, { "Content-Type": "text/html" });' >> server.js && \
    echo '    res.end(\"<html><body><h1>Report Analyzer (Debug)</h1><p>Checking file existence...</p></body></html>\");' >> server.js && \
    echo '    return;' >> server.js && \
    echo '  }' >> server.js && \
    echo '' >> server.js && \
    echo '  // Handle all other requests with a redirect' >> server.js && \
    echo '  res.writeHead(302, { "Location": "/" });' >> server.js && \
    echo '  res.end();' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Start the server' >> server.js && \
    echo 'server.listen(port, "0.0.0.0", () => {' >> server.js && \
    echo '  console.log(`Server running on port ${port}`);' >> server.js && \
    echo '  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);' >> server.js && \
    echo '});'

# Verify the server.js file was created during build
RUN echo "--- Build Step: Contents of /app ---" && ls -la /app

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# *** DEBUGGING STEP ***
# List directory contents at runtime instead of starting node
CMD ["ls", "-la", "/app"] 