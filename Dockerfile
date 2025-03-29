FROM node:18-alpine

# Create app directory outside of /app to avoid Coolify's volume mount
WORKDIR /simple-app

# Create public directory for static files
RUN mkdir -p public

# Create a very simple index.html
RUN echo '<!DOCTYPE html><html><head><title>AI Report Analyzer</title><style>body{font-family:Arial,sans-serif;margin:0;padding:0;line-height:1.6;text-align:center;background:#f5f5f5}header{background:#0066cc;color:white;padding:20px}main{max-width:800px;margin:20px auto;padding:20px;background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}footer{margin-top:30px;color:#666}</style></head><body><header><h1>AI Report Analyzer</h1></header><main><h2>Welcome to AI Report Analyzer</h2><p>Our platform helps you extract insights from complex reports using advanced AI technology.</p><p>Server time: <span id="server-time"></span></p></main><footer>&copy; 2025 AI Report Analyzer</footer><script>document.getElementById("server-time").textContent = new Date().toISOString();</script></body></html>' > public/index.html

# Create an ultra simple server with extensive logging
RUN echo 'const http = require("http");' > server.js && \
    echo 'const fs = require("fs");' >> server.js && \
    echo 'const path = require("path");' >> server.js && \
    echo 'const port = process.env.PORT || 9000;' >> server.js && \
    echo '' >> server.js && \
    echo 'console.log(`Starting server on port ${port}`);' >> server.js && \
    echo 'console.log(`Current directory: ${__dirname}`);' >> server.js && \
    echo 'console.log(`Files in public directory:`);' >> server.js && \
    echo 'try {' >> server.js && \
    echo '  console.log(fs.readdirSync(path.join(__dirname, "public")).join(", "));' >> server.js && \
    echo '} catch (err) {' >> server.js && \
    echo '  console.error(`Error reading directory: ${err.message}`);' >> server.js && \
    echo '}' >> server.js && \
    echo '' >> server.js && \
    echo 'const indexHtml = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");' >> server.js && \
    echo 'console.log(`Successfully loaded index.html (${indexHtml.length} bytes)`);' >> server.js && \
    echo '' >> server.js && \
    echo 'const server = http.createServer((req, res) => {' >> server.js && \
    echo '  const timestamp = new Date().toISOString();' >> server.js && \
    echo '  console.log(`[${timestamp}] ${req.method} ${req.url}`);' >> server.js && \
    echo '' >> server.js && \
    echo '  // Health check endpoint' >> server.js && \
    echo '  if (req.url === "/health" || req.url === "/api/health") {' >> server.js && \
    echo '    console.log(`[${timestamp}] Serving health check response`);' >> server.js && \
    echo '    res.writeHead(200, { "Content-Type": "application/json" });' >> server.js && \
    echo '    res.end(JSON.stringify({' >> server.js && \
    echo '      status: "ok",' >> server.js && \
    echo '      time: timestamp,' >> server.js && \
    echo '      uptime: process.uptime()' >> server.js && \
    echo '    }));' >> server.js && \
    echo '    return;' >> server.js && \
    echo '  }' >> server.js && \
    echo '' >> server.js && \
    echo '  // Serve the index.html for all other requests' >> server.js && \
    echo '  console.log(`[${timestamp}] Serving index.html`);' >> server.js && \
    echo '  res.writeHead(200, { "Content-Type": "text/html" });' >> server.js && \
    echo '  res.end(indexHtml);' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo 'server.on("error", (err) => {' >> server.js && \
    echo '  console.error(`Server error: ${err.message}`);' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo 'server.listen(port, "0.0.0.0", () => {' >> server.js && \
    echo '  console.log(`Server is running at http://0.0.0.0:${port}/`);' >> server.js && \
    echo '  console.log(`Environment: ${process.env.NODE_ENV}`);' >> server.js && \
    echo '});' >> server.js

# Set environment variables  
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server with increased diagnostic output
CMD ["node", "--trace-warnings", "server.js"] 