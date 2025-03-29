const http = require("http");
const fs = require("fs");
const path = require("path");
const port = process.env.PORT || 9000;

// Pre-load the HTML file to avoid file system operations during requests
let indexHtml;
try {
  console.log(`Loading index.html from ${path.join(__dirname, "public", "index.html")}`);
  indexHtml = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  console.log(`Successfully loaded index.html (${indexHtml.length} bytes)`);
} catch (err) {
  console.error(`CRITICAL ERROR loading index.html: ${err.message}`);
  // Create a simple fallback HTML if the file can't be loaded
  indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>AI Report Analyzer - Fallback</title>
  <style>
    body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #0066cc; }
    .error { color: #cc0000; background: #ffeeee; padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>AI Report Analyzer</h1>
  <p>This is a fallback page. The server was unable to load the main page.</p>
  <div class="error">Error: ${err?.message || "Unknown error"}</div>
  <p>Server time: ${new Date().toISOString()}</p>
</body>
</html>`;
  console.log("Created fallback HTML page");
}

// Initialize the server
console.log(`Starting server on port ${port}`);
console.log(`Current directory: ${__dirname}`);

// List all files in the public directory
try {
  const files = fs.readdirSync(path.join(__dirname, "public"));
  console.log(`Files in public directory: ${files.join(", ")}`);
} catch (err) {
  console.error(`Error reading public directory: ${err.message}`);
}

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    
    // Health check endpoint
    if (req.url === "/health" || req.url === "/api/health") {
      console.log(`[${timestamp}] Serving health check`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        time: timestamp,
        uptime: process.uptime()
      }));
      return;
    }
    
    // Serve the pre-loaded HTML for all other requests
    console.log(`[${timestamp}] Serving index.html (${indexHtml.length} bytes)`);
    res.writeHead(200, { 
      "Content-Type": "text/html",
      "Cache-Control": "no-cache",
      "X-Response-Time": `${Date.now() - start}ms`
    });
    res.end(indexHtml);
    console.log(`[${timestamp}] Response sent in ${Date.now() - start}ms`);
    
  } catch (error) {
    console.error(`[${timestamp}] Server error: ${error.message}`);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`Server Error: ${error.message}`);
  }
});

// Error handling for the server
server.on("error", (err) => {
  console.error(`CRITICAL: Server error: ${err.message}`);
});

// Start the server
server.listen(port, "0.0.0.0", () => {
  console.log(`READY: Server is running at http://0.0.0.0:${port}/`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
}); 