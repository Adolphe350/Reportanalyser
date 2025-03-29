// Ultra-simplified server with minimal dependencies
const http = require("http");
const fs = require("fs");
const path = require("path");
const port = process.env.PORT || 9000;

// Startup logging
console.log(`[STARTUP] Node.js ${process.version}`);
console.log(`[STARTUP] Current directory: ${__dirname}`);
console.log(`[STARTUP] Starting server on port ${port}`);
console.log(`[STARTUP] Environment: ${process.env.NODE_ENV}`);
console.log(`[STARTUP] Network interfaces:`);

// Log network interfaces for debugging connection issues
try {
  const networkInterfaces = require('os').networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    networkInterfaces[interfaceName].forEach(iface => {
      console.log(`  ${interfaceName}: ${iface.address} (${iface.family})`);
    });
  }
} catch (err) {
  console.error(`[STARTUP] Error getting network info: ${err.message}`);
}

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

// Content type mapping
const contentTypeMap = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

// Cache frequently used files
const fileCache = {};
const cacheableExtensions = ['.html', '.css', '.js'];

// Preload index.html and dashboard.html
try {
  ['index.html', 'dashboard.html'].forEach(fileName => {
    const filePath = path.join(__dirname, 'public', fileName);
    console.log(`[STARTUP] Preloading ${fileName} from ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      fileCache[`/${fileName}`] = {
        content: fs.readFileSync(filePath, 'utf8'),
        contentType: 'text/html'
      };
      console.log(`[STARTUP] Successfully cached ${fileName} (${fileCache[`/${fileName}`].content.length} bytes)`);
    } else {
      console.log(`[STARTUP] ${fileName} not found, will serve dynamically if requested`);
    }
  });
} catch (err) {
  console.error(`[STARTUP] Error preloading files: ${err.message}`);
}

// Function to serve a file
function serveFile(req, res, filePath) {
  const start = Date.now();
  const fileUrl = req.url === '/' ? '/index.html' : req.url;
  const ext = path.extname(fileUrl).toLowerCase();
  
  // Check cache first for HTML, CSS and JS files
  if (cacheableExtensions.includes(ext) && fileCache[fileUrl]) {
    console.log(`[FILE] Serving ${fileUrl} from cache`);
    res.writeHead(200, { 
      'Content-Type': fileCache[fileUrl].contentType,
      'Connection': 'close',
      'X-Response-Time': `${Date.now() - start}ms`
    });
    res.end(fileCache[fileUrl].content);
    console.log(`[REQUEST] Response completed in ${Date.now() - start}ms`);
    return;
  }
  
  // For other files, check if they exist
  const localFilePath = path.join(__dirname, 'public', fileUrl === '/' ? 'index.html' : fileUrl.substring(1));
  console.log(`[FILE] Checking for file at ${localFilePath}`);
  
  fs.stat(localFilePath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.log(`[FILE] File not found: ${localFilePath}`);
      
      // If not found but is an HTML request, try to serve index.html
      if (fileUrl.endsWith('.html') && fileCache['/index.html']) {
        console.log(`[FILE] Serving index.html as fallback`);
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Connection': 'close',
          'X-Response-Time': `${Date.now() - start}ms`
        });
        res.end(fileCache['/index.html'].content);
      } else {
        // Serve 404
        res.writeHead(404, { 
          'Content-Type': 'text/plain',
          'Connection': 'close'
        });
        res.end('File not found');
      }
      console.log(`[REQUEST] Response completed in ${Date.now() - start}ms`);
      return;
    }
    
    // Determine content type
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Serve file
    fs.readFile(localFilePath, (err, data) => {
      if (err) {
        console.error(`[ERROR] Error reading file: ${err.message}`);
        res.writeHead(500, { 
          'Content-Type': 'text/plain',
          'Connection': 'close'
        });
        res.end('Internal Server Error');
      } else {
        console.log(`[FILE] Serving file: ${localFilePath} (${data.length} bytes)`);
        
        // Cache the file if it's cacheable
        if (cacheableExtensions.includes(ext)) {
          fileCache[fileUrl] = {
            content: data.toString(),
            contentType
          };
          console.log(`[FILE] Cached ${fileUrl} for future requests`);
        }
        
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Connection': 'close',
          'X-Response-Time': `${Date.now() - start}ms`
        });
        res.end(data);
      }
      console.log(`[REQUEST] Response completed in ${Date.now() - start}ms`);
    });
  });
}

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  const start = Date.now();
  
  try {
    console.log(`[REQUEST] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
    console.log(`[REQUEST] Headers: ${JSON.stringify(req.headers)}`);
    
    // For health checks
    if (req.url === "/health" || req.url === "/api/health") {
      console.log(`[HEALTH] Serving health check response`);
      res.writeHead(200, { 
        "Content-Type": "application/json",
        "Connection": "close" 
      });
      res.end(JSON.stringify({ 
        status: "ok", 
        time: new Date().toISOString(),
        uptime: process.uptime()
      }));
      return;
    }
    
    // For static files
    serveFile(req, res);
    
  } catch (err) {
    console.error(`[ERROR] Request handler error: ${err.message}`);
    res.writeHead(500, { "Content-Type": "text/plain", "Connection": "close" });
    res.end("Server Error");
  }
});

// Connection listeners
server.on('connection', (socket) => {
  console.log(`[CONNECTION] New connection from ${socket.remoteAddress}`);
  
  socket.on('error', (err) => {
    console.error(`[CONNECTION] Socket error: ${err.message}`);
  });
  
  socket.on('close', (hadError) => {
    console.log(`[CONNECTION] Socket closed ${hadError ? 'with error' : 'cleanly'}`);
  });
});

// Set a timeout handler
server.setTimeout(60000, (socket) => {
  console.log(`[TIMEOUT] Socket timeout from ${socket.remoteAddress}`);
  socket.destroy();
});

// Error handler
server.on("error", (err) => {
  console.error(`[ERROR] Server error: ${err.message}`);
});

// Start listening
server.listen(port, "0.0.0.0", () => {
  console.log(`[READY] Server is running at http://0.0.0.0:${port}/`);
  console.log(`[READY] Ready to accept connections`);
}); 