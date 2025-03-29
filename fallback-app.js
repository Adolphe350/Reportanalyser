const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 9000;

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files if public directory exists
if (fs.existsSync(path.join(__dirname, 'public'))) {
  console.log('Serving static files from public directory');
  app.use(express.static(path.join(__dirname, 'public')));
} else {
  console.log('Public directory not found, generating fallback content');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mode: 'fallback',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Serve HTML for root route
app.get('/', (req, res) => {
  // Check if we have an index.html in public
  const indexPath = path.join(__dirname, 'public', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log('Serving existing index.html');
    res.sendFile(indexPath);
  } else {
    console.log('Generating fallback HTML');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reportanalyser - Fallback Mode</title>
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
          <p>Welcome to the AI Report Analyzer application. The system is currently running in fallback mode.</p>
          
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
              <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
              <li>Port: ${port}</li>
              <li>Time: ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <p><a href="/api/health">View Health Status</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

// Catch-all route
app.get('*', (req, res) => {
  res.redirect('/');
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Fallback app running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 