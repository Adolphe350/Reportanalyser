const http = require("http");
const fs = require("fs");
const path = require("path");
const port = process.env.PORT || 9000;

console.log(`Starting server on port ${port}`);
console.log(`Current directory: ${__dirname}`);
console.log(`Files in public directory:`);
try {
  console.log(fs.readdirSync(path.join(__dirname, "public")).join(", "));
} catch (err) {
  console.error(`Error reading directory: ${err.message}`);
}

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  // Health check endpoint
  if (req.url === "/health" || req.url === "/api/health") {
    console.log(`[${timestamp}] Serving health check response`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      time: timestamp,
      uptime: process.uptime()
    }));
    return;
  }

  // Serve the index.html for all other requests
  const indexPath = path.join(__dirname, "public", "index.html");
  console.log(`[${timestamp}] Reading index.html from ${indexPath}`);

  fs.readFile(indexPath, "utf8", (err, content) => {
    if (err) {
      console.error(`Error reading index.html: ${err.message}`);
      res.writeHead(500);
      res.end(`Server Error: Unable to read index.html`);
      return;
    }

    console.log(`[${timestamp}] Successfully read index.html (${content.length} bytes)`);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(content);
  });
});

server.on("error", (err) => {
  console.error(`Server error: ${err.message}`);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running at http://0.0.0.0:${port}/`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
}); 