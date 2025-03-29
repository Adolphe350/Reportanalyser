// Ultra-simplified server with minimal dependencies
const http = require("http");
const fs = require("fs");
const path = require("path");
const port = process.env.PORT || 9000;

// Startup logging
console.log(`[STARTUP] Node.js ${process.version}`);
console.log(`[STARTUP] Current directory: ${__dirname}`);
console.log(`[STARTUP] Starting server on port ${port}`);

// Minimal HTML content as fallback
const fallbackHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>AI Report Analyzer</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #0066cc; }
    .info { background: #f0f0f0; padding: 10px; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>AI Report Analyzer</h1>
  <p>Simple demo page served directly from memory.</p>
  <div class="info">
    <p>Server time: ${new Date().toISOString()}</p>
    <p>Node.js: ${process.version}</p>
  </div>
</body>
</html>
`;

// Try to load HTML from file
let indexHtml;
try {
  const indexPath = path.join(__dirname, "public", "index.html");
  console.log(`[STARTUP] Attempting to load index.html from ${indexPath}`);
  
  if (fs.existsSync(indexPath)) {
    indexHtml = fs.readFileSync(indexPath, "utf8");
    console.log(`[STARTUP] Successfully loaded index.html (${indexHtml.length} bytes)`);
  } else {
    console.log(`[STARTUP] index.html not found, using fallback`);
    indexHtml = fallbackHtml;
  }
} catch (err) {
  console.error(`[STARTUP] Error loading index.html: ${err.message}`);
  indexHtml = fallbackHtml;
}

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  try {
    // For health checks
    if (req.url === "/health" || req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", time: new Date().toISOString() }));
      return;
    }
    
    // For all other requests, serve the HTML
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(indexHtml);
  } catch (err) {
    console.error(`[ERROR] Request handler error: ${err.message}`);
    res.writeHead(500);
    res.end("Server Error");
  }
});

// Set a timeout handler
server.setTimeout(10000, (socket) => {
  console.log("[ERROR] Socket timeout");
  socket.destroy();
});

// Error handler
server.on("error", (err) => {
  console.error(`[ERROR] Server error: ${err.message}`);
});

// Start listening
server.listen(port, "0.0.0.0", () => {
  console.log(`[READY] Server is running at http://0.0.0.0:${port}/`);
}); 