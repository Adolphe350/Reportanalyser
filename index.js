const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 9000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Welcome to Reportanalyser API',
    status: 'running',
    environment: process.env.NODE_ENV,
    port: port
  });
});

// Serve the main HTML file for all routes to support client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Reportanalyser app listening at http://0.0.0.0:${port}`);
}); 