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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log(`[STARTUP] Creating uploads directory at ${uploadsDir}`);
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[STARTUP] Successfully created uploads directory`);
  } catch (err) {
    console.error(`[STARTUP] Error creating uploads directory: ${err.message}`);
  }
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
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

// Function to handle file uploads
function handleFileUpload(req, res) {
  console.log(`[UPLOAD] Starting file upload handler`);
  const start = Date.now();
  
  // Generate a boundary from the content-type header
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    console.error(`[UPLOAD] Invalid content type: ${contentType}`);
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      success: false,
      message: 'Invalid content type. Expected multipart/form-data'
    }));
    return;
  }
  
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    console.error(`[UPLOAD] No boundary found in content-type: ${contentType}`);
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      success: false,
      message: 'Invalid boundary in multipart/form-data'
    }));
    return;
  }
  
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  console.log(`[UPLOAD] Boundary: ${boundary}`);
  
  // Get content length for upload monitoring
  const contentLength = parseInt(req.headers['content-length'], 10);
  if (isNaN(contentLength)) {
    console.error(`[UPLOAD] Invalid or missing content-length header`);
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      success: false,
      message: 'Missing or invalid content-length header'
    }));
    return;
  }
  
  console.log(`[UPLOAD] Expected content length: ${contentLength} bytes`);
  
  // Set up variables for tracking data
  let buffer = Buffer.alloc(0);
  let fileName = '';
  let fileType = '';
  let totalBytesReceived = 0;
  
  // Simulated analysis results for the mock file upload demo
  const analysisResults = {
    title: 'Analysis Summary',
    timestamp: new Date().toISOString(),
    keyInsights: [
      'Multiple growth opportunities identified in emerging markets',
      'Customer satisfaction metrics increased by 18% year-over-year',
      'Operational efficiency improvements suggested for manufacturing division',
      'Competitor analysis reveals potential for market share expansion'
    ],
    metrics: {
      sentiment: 0.78,
      confidence: 0.92,
      topics: ['growth', 'customer experience', 'operational efficiency', 'market analysis']
    },
    recommendations: [
      'Allocate additional resources to emerging market expansion',
      'Implement customer feedback program across all service channels',
      'Review manufacturing processes for potential automation improvements',
      'Consider strategic partnerships in complementary market segments'
    ]
  };
  
  // Handle data chunks as they arrive
  req.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    totalBytesReceived += chunk.length;
    
    // Log progress for large uploads
    if (totalBytesReceived % 500000 === 0 || totalBytesReceived === contentLength) {
      console.log(`[UPLOAD] Received ${totalBytesReceived} of ${contentLength} bytes (${Math.round(totalBytesReceived / contentLength * 100)}%)`);
    }
  });
  
  // Process the complete upload
  req.on('end', () => {
    console.log(`[UPLOAD] Upload complete. Processing...`);
    
    try {
      // Simple parsing of the first file in multipart data
      // Note: This is a very simplified parser for demonstration purposes
      const dataStr = buffer.toString();
      
      // Find filename from form-data
      const filenameMatch = dataStr.match(/filename="([^"]+)"/i);
      if (filenameMatch) {
        fileName = filenameMatch[1];
        console.log(`[UPLOAD] Filename: ${fileName}`);
      }
      
      // Extract file type
      if (fileName) {
        const ext = path.extname(fileName).toLowerCase();
        fileType = contentTypeMap[ext] || 'application/octet-stream';
        console.log(`[UPLOAD] File type: ${fileType}`);
      }
      
      // Find the actual file data boundary
      const headerEndIndex = dataStr.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) {
        throw new Error('Invalid multipart format: Could not find header boundary');
      }
      
      // Generate a unique filename for storage
      const uniqueFilename = `${Date.now()}-${fileName || 'upload'}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      console.log(`[UPLOAD] Saving file to ${filePath}`);
      
      // In a real implementation, you would carefully extract the file content
      // For this demo, we'll just simulate successful processing
      
      // Respond with success and analysis results
      console.log(`[UPLOAD] File processed successfully in ${Date.now() - start}ms`);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Connection': 'close',
        'X-Response-Time': `${Date.now() - start}ms`
      });
      
      // Return simulated analysis results
      res.end(JSON.stringify({
        success: true,
        message: 'File uploaded and analyzed successfully',
        file: {
          originalName: fileName,
          size: totalBytesReceived,
          type: fileType,
          savedAs: uniqueFilename
        },
        analysis: analysisResults
      }));
      
    } catch (err) {
      console.error(`[UPLOAD] Error processing upload: ${err.message}`);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Connection': 'close'
      });
      res.end(JSON.stringify({
        success: false,
        message: `Error processing upload: ${err.message}`
      }));
    }
  });
  
  // Handle upload errors
  req.on('error', (err) => {
    console.error(`[UPLOAD] Upload error: ${err.message}`);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      success: false,
      message: `Upload error: ${err.message}`
    }));
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
    
    // Handle file uploads
    if (req.method === 'POST' && req.url === '/api/upload') {
      console.log(`[UPLOAD] Received file upload request`);
      handleFileUpload(req, res);
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