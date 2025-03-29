const http = require('http');

const port = process.env.PORT || 9000;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Log the request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Health check endpoint
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      time: new Date().toISOString(),
      node: process.version
    }));
    return;
  }

  // Root endpoint with HTML
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Report Analyzer</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .container { background-color: #f5f5f5; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
          h1 { color: #0066cc; }
          .card { background: white; border-radius: 5px; padding: 15px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>AI Report Analyzer</h1>
          <p>Welcome to the AI Report Analyzer application.</p>
          
          <div class="card">
            <h2>Upload Reports</h2>
            <p>Process large reports up to hundreds of pages. Our AI handles document segmentation and comprehensive analysis.</p>
          </div>
          
          <div class="card">
            <h2>Detailed Insights</h2>
            <p>Get key metrics, trends, and patterns extracted from your reports with visual representations.</p>
          </div>
          
          <div class="card">
            <h2>Server Information</h2>
            <ul>
              <li>Node.js version: ${process.version}</li>
              <li>Environment: ${process.env.NODE_ENV || "development"}</li>
              <li>Port: ${port}</li>
              <li>Time: ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <p><a href="/api/health">View Health Status</a></p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // Handle all other requests
  res.writeHead(302, { 'Location': '/' });
  res.end();
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 