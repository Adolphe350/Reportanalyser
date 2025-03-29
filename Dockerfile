FROM node:18-alpine

# Create app directory
WORKDIR /app

# Create a minimal package.json in case it doesn't get copied
RUN echo '{"name":"reportanalyser","version":"1.0.0","dependencies":{"express":"^4.18.2"}}' > package.json

# Install dependencies
RUN npm install

# Log contents
RUN echo "Contents after npm install:" && ls -la

# Create a simple Express server directly in the Dockerfile
RUN echo 'const express = require("express");' > server.js && \
    echo 'const app = express();' >> server.js && \
    echo 'const port = process.env.PORT || 9000;' >> server.js && \
    echo '' >> server.js && \
    echo '// Log middleware' >> server.js && \
    echo 'app.use((req, res, next) => {' >> server.js && \
    echo '  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);' >> server.js && \
    echo '  next();' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Health check endpoint' >> server.js && \
    echo 'app.get("/api/health", (req, res) => {' >> server.js && \
    echo '  res.status(200).json({' >> server.js && \
    echo '    status: "ok",' >> server.js && \
    echo '    time: new Date().toISOString(),' >> server.js && \
    echo '    node: process.version' >> server.js && \
    echo '  });' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Root endpoint with HTML' >> server.js && \
    echo 'app.get("/", (req, res) => {' >> server.js && \
    echo '  res.send(`' >> server.js && \
    echo '    <!DOCTYPE html>' >> server.js && \
    echo '    <html>' >> server.js && \
    echo '    <head>' >> server.js && \
    echo '      <title>AI Report Analyzer</title>' >> server.js && \
    echo '      <style>' >> server.js && \
    echo '        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }' >> server.js && \
    echo '        .container { background-color: #f5f5f5; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }' >> server.js && \
    echo '        h1 { color: #0066cc; }' >> server.js && \
    echo '        .card { background: white; border-radius: 5px; padding: 15px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }' >> server.js && \
    echo '      </style>' >> server.js && \
    echo '    </head>' >> server.js && \
    echo '    <body>' >> server.js && \
    echo '      <div class="container">' >> server.js && \
    echo '        <h1>AI Report Analyzer</h1>' >> server.js && \
    echo '        <p>Welcome to the AI Report Analyzer application.</p>' >> server.js && \
    echo '        ' >> server.js && \
    echo '        <div class="card">' >> server.js && \
    echo '          <h2>Upload Reports</h2>' >> server.js && \
    echo '          <p>Process large reports up to hundreds of pages. Our AI handles document segmentation and comprehensive analysis.</p>' >> server.js && \
    echo '        </div>' >> server.js && \
    echo '        ' >> server.js && \
    echo '        <div class="card">' >> server.js && \
    echo '          <h2>Detailed Insights</h2>' >> server.js && \
    echo '          <p>Get key metrics, trends, and patterns extracted from your reports with visual representations.</p>' >> server.js && \
    echo '        </div>' >> server.js && \
    echo '        ' >> server.js && \
    echo '        <div class="card">' >> server.js && \
    echo '          <h2>Server Information</h2>' >> server.js && \
    echo '          <ul>' >> server.js && \
    echo '            <li>Node.js version: \${process.version}</li>' >> server.js && \
    echo '            <li>Environment: \${process.env.NODE_ENV || "development"}</li>' >> server.js && \
    echo '            <li>Port: \${port}</li>' >> server.js && \
    echo '            <li>Time: \${new Date().toISOString()}</li>' >> server.js && \
    echo '          </ul>' >> server.js && \
    echo '        </div>' >> server.js && \
    echo '        ' >> server.js && \
    echo '        <p><a href="/api/health">View Health Status</a></p>' >> server.js && \
    echo '      </div>' >> server.js && \
    echo '    </body>' >> server.js && \
    echo '    </html>' >> server.js && \
    echo '  `);' >> server.js && \
    echo '});' >> server.js && \
    echo '' >> server.js && \
    echo '// Start the server' >> server.js && \
    echo 'app.listen(port, "0.0.0.0", () => {' >> server.js && \
    echo '  console.log(`Server running on port ${port}`);' >> server.js && \
    echo '});'

# Set environment variables
ENV PORT=9000
ENV NODE_ENV=production

# Expose the port
EXPOSE 9000

# Start the Express server
CMD ["node", "server.js"] 