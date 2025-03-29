FROM node:18-alpine

# Create a different app directory to avoid Coolify's volume mount on /app
WORKDIR /srv/app

# Create a minimal package.json
RUN echo '{"name":"reportanalyser-minimal","version":"1.0.0","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{}}' > package.json

# Create public directory for static files
RUN mkdir -p public

# Create index.html landing page
RUN echo '<!DOCTYPE html>' > public/index.html && \
    echo '<html lang="en">' >> public/index.html && \
    echo '<head>' >> public/index.html && \
    echo '  <meta charset="UTF-8">' >> public/index.html && \
    echo '  <meta name="viewport" content="width=device-width, initial-scale=1.0">' >> public/index.html && \
    echo '  <title>AI Report Analyzer</title>' >> public/index.html && \
    echo '  <style>' >> public/index.html && \
    echo '    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }' >> public/index.html && \
    echo '    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }' >> public/index.html && \
    echo '    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }' >> public/index.html && \
    echo '    .card { background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; overflow: hidden; }' >> public/index.html && \
    echo '    .card-header { background-color: #f0f0f0; padding: 15px 20px; border-bottom: 1px solid #e0e0e0; }' >> public/index.html && \
    echo '    .card-body { padding: 20px; }' >> public/index.html && \
    echo '    .btn { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px; }' >> public/index.html && \
    echo '    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }' >> public/index.html && \
    echo '    .feature-item { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }' >> public/index.html && \
    echo '    .feature-icon { font-size: 24px; margin-bottom: 10px; color: #0066cc; }' >> public/index.html && \
    echo '  </style>' >> public/index.html && \
    echo '</head>' >> public/index.html && \
    echo '<body>' >> public/index.html && \
    echo '  <div class="header">' >> public/index.html && \
    echo '    <h1>AI Report Analyzer</h1>' >> public/index.html && \
    echo '    <p>Process and analyze your reports with advanced AI technology</p>' >> public/index.html && \
    echo '  </div>' >> public/index.html && \
    echo '' >> public/index.html && \
    echo '  <div class="container">' >> public/index.html && \
    echo '    <div class="card">' >> public/index.html && \
    echo '      <div class="card-header">' >> public/index.html && \
    echo '        <h2>Welcome to Report Analyzer</h2>' >> public/index.html && \
    echo '      </div>' >> public/index.html && \
    echo '      <div class="card-body">' >> public/index.html && \
    echo '        <p>Use our advanced AI technology to process and analyze large reports quickly and efficiently. Upload your documents and get insights in minutes.</p>' >> public/index.html && \
    echo '        <a href="/upload" class="btn">Upload Report</a>' >> public/index.html && \
    echo '        <a href="/api/health" class="btn">Check API Health</a>' >> public/index.html && \
    echo '      </div>' >> public/index.html && \
    echo '    </div>' >> public/index.html && \
    echo '' >> public/index.html && \
    echo '    <h2>Key Features</h2>' >> public/index.html && \
    echo '    <div class="feature-grid">' >> public/index.html && \
    echo '      <div class="feature-item">' >> public/index.html && \
    echo '        <div class="feature-icon">📊</div>' >> public/index.html && \
    echo '        <h3>Data Extraction</h3>' >> public/index.html && \
    echo '        <p>Automatically extract key information from complex documents and reports.</p>' >> public/index.html && \
    echo '      </div>' >> public/index.html && \
    echo '      <div class="feature-item">' >> public/index.html && \
    echo '        <div class="feature-icon">🔍</div>' >> public/index.html && \
    echo '        <h3>Advanced Analysis</h3>' >> public/index.html && \
    echo '        <p>Get detailed insights and patterns through sophisticated AI algorithms.</p>' >> public/index.html && \
    echo '      </div>' >> public/index.html && \
    echo '      <div class="feature-item">' >> public/index.html && \
    echo '        <div class="feature-icon">📈</div>' >> public/index.html && \
    echo '        <h3>Visual Reports</h3>' >> public/index.html && \
    echo '        <p>View your data in easy-to-understand charts and visualizations.</p>' >> public/index.html && \
    echo '      </div>' >> public/index.html && \
    echo '    </div>' >> public/index.html && \
    echo '  </div>' >> public/index.html && \
    echo '</body>' >> public/index.html && \
    echo '</html>'

# Create a health check HTML page
RUN echo '<!DOCTYPE html>' > public/health.html && \
    echo '<html><head><title>Health Status</title>' >> public/health.html && \
    echo '<style>body{font-family:Arial;max-width:800px;margin:0 auto;padding:20px}' >> public/health.html && \
    echo '.status{padding:20px;background:#e7f7e7;border:1px solid #c3e6c3;border-radius:5px}' >> public/health.html && \
    echo 'h1{color:#0066cc}</style></head>' >> public/health.html && \
    echo '<body><h1>Server Health Status</h1>' >> public/health.html && \
    echo '<div class="status"><h2>Status: Online</h2>' >> public/health.html && \
    echo '<p>The server is operational and responding to requests.</p>' >> public/health.html && \
    echo '<p><a href="/">Return to Homepage</a></p></div></body></html>' >> public/health.html

# Create a favicon placeholder
RUN echo 'This is a placeholder for favicon' > public/favico.txt

# Create the server.js file to serve static files from public directory
RUN echo 'const http = require("http");' > server.js && \
    echo 'const fs = require("fs");' >> server.js && \
    echo 'const path = require("path");' >> server.js && \
    echo 'const port = process.env.PORT || 9000;' >> server.js && \
    echo '' >> server.js && \
    echo '// Map file extensions to content types' >> server.js && \
    echo 'const contentTypes = {' >> server.js && \
    echo '  ".html": "text/html",' >> server.js && \
    echo '  ".css": "text/css",' >> server.js && \
    echo '  ".js": "text/javascript",' >> server.js && \
    echo '  ".json": "application/json",' >> server.js && \
    echo '  ".png": "image/png",' >> server.js && \
    echo '  ".jpg": "image/jpeg",' >> server.js && \
    echo '  ".jpeg": "image/jpeg",' >> server.js && \
    echo '  ".gif": "image/gif",' >> server.js && \
    echo '  ".svg": "image/svg+xml",' >> server.js && \
    echo '  ".ico": "image/x-icon"' >> server.js && \
    echo '};' >> server.js && \
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
    echo '      node: process.version,' >> server.js && \
    echo '      directory: __dirname' >> server.js && \
    echo '    }));' >> server.js && \
    echo '    return;' >> server.js && \
    echo '  }' >> server.js && \
    echo '' >> server.js && \
    echo '  // Health page' >> server.js && \
    echo '  if (req.url === "/health") {' >> server.js && \
    echo '    fs.readFile(path.join(__dirname, "public", "health.html"), (err, content) => {' >> server.js && \
    echo '      if (err) {' >> server.js && \
    echo '        res.writeHead(500);' >> server.js && \
    echo '        res.end("Error loading health page");' >> server.js && \
    echo '        return;' >> server.js && \
    echo '      }' >> server.js && \
    echo '      res.writeHead(200, { "Content-Type": "text/html" });' >> server.js && \
    echo '      res.end(content);' >> server.js && \
    echo '    });' >> server.js && \
    echo '    return;' >> server.js && \
    echo '  }' >> server.js && \
    echo '' >> server.js && \
    echo '  // Favicon handling' >> server.js && \
    echo '  if (req.url === "/favicon.ico") {' >> server.js && \
    echo '    res.writeHead(204);' >> server.js && \
    echo '    res.end();' >> server.js && \
    echo '    return;' >> server.js && \
    echo '  }' >> server.js && \
    echo '' >> server.js && \
    echo '  // Serve static files from public directory' >> server.js && \
    echo '  let filePath = path.join(__dirname, "public", req.url === "/" ? "index.html" : req.url);' >> server.js && \
    echo '  const extname = path.extname(filePath);' >> server.js && \
    echo '' >> server.js && \
    echo '  // Check if the file exists' >> server.js && \
    echo '  fs.access(filePath, fs.constants.F_OK, (err) => {' >> server.js && \
    echo '    if (err) {' >> server.js && \
    echo '      // If the file does not exist and has no extension, serve index.html (client-side routing)' >> server.js && \
    echo '      if (!extname) {' >> server.js && \
    echo '        filePath = path.join(__dirname, "public", "index.html");' >> server.js && \
    echo '      } else {' >> server.js && \
    echo '        // Otherwise return 404' >> server.js && \
    echo '        res.writeHead(404);' >> server.js && \
    echo '        res.end("404 Not Found");' >> server.js && \
    echo '        return;' >> server.js && \
    echo '      }' >> server.js && \
    echo '    }' >> server.js && \
    echo '' >> server.js && \
    echo '    // Read and serve the file' >> server.js && \
    echo '    fs.readFile(filePath, (err, content) => {' >> server.js && \
    echo '      if (err) {' >> server.js && \
    echo '        res.writeHead(500);' >> server.js && \
    echo '        res.end(`Server Error: ${err.code}`);' >> server.js && \
    echo '        return;' >> server.js && \
    echo '      }' >> server.js && \
    echo '' >> server.js && \
    echo '      // Determine content type' >> server.js && \
    echo '      const contentType = contentTypes[extname] || "text/plain";' >> server.js && \
    echo '      res.writeHead(200, { "Content-Type": contentType });' >> server.js && \
    echo '      res.end(content);' >> server.js && \
    echo '    });' >> server.js && \
    echo '  });' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Start the server' >> server.js && \
    echo 'server.listen(port, "0.0.0.0", () => {' >> server.js && \
    echo '  console.log(`Server running on port ${port}`);' >> server.js && \
    echo '  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);' >> server.js && \
    echo '  console.log(`Directory: ${__dirname}`);' >> server.js && \
    echo '  console.log(`Public directory: ${path.join(__dirname, "public")}`);' >> server.js && \
    echo '});'

# Verify the server.js file and public directory were created during build
RUN echo "--- Build Step: Contents of /srv/app ---" && ls -la /srv/app && \
    echo "--- Build Step: Contents of /srv/app/public ---" && ls -la /srv/app/public

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the server using the generated server.js
CMD ["node", "/srv/app/server.js"] 