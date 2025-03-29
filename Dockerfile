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
    echo '    res.end(`' >> server.js && \
    echo '      <!DOCTYPE html>' >> server.js && \
    echo '      <html>' >> server.js && \
    echo '      <head>' >> server.js && \
    echo '        <title>AI Report Analyzer (Self-Contained)</title>' >> server.js && \
    echo '        <style>' >> server.js && \
    echo '          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }' >> server.js && \
    echo '          .container { background-color: #f5f5f5; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }' >> server.js && \
    echo '          h1 { color: #0066cc; }' >> server.js && \
    echo '          .card { background: white; border-radius: 5px; padding: 15px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }' >> server.js && \
    echo '        </style>' >> server.js && \
    echo '      </head>' >> server.js && \
    echo '      <body>' >> server.js && \
    echo '        <div class="container">' >> server.js && \
    echo '          <h1>AI Report Analyzer</h1>' >> server.js && \
    echo '          <p>Welcome! This is the self-contained version running directly from the Dockerfile.</p>' >> server.js && \
    echo '          <div class="card"><h2>Server Information</h2><ul><li>Node.js version: ${process.version}</li><li>Environment: ${process.env.NODE_ENV || "development"}</li><li>Port: ${port}</li><li>Time: ${new Date().toISOString()}</li></ul></div>' >> server.js && \
    echo '          <p><a href="/api/health">View Health Status</a></p>' >> server.js && \
    echo '        </div>' >> server.js && \
    echo '      </body>' >> server.js && \
    echo '      </html>' >> server.js && \
    echo '    `);' >> server.js && \
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

# Verify the server.js file was created
RUN ls -la

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server using the generated server.js
CMD ["node", "server.js"] 