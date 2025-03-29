const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 9000;

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Health check endpoint for proxies and load balancers
app.get('/api/health', (req, res) => {
  console.log('Health check request received');
  res.status(200).json({
    message: 'Welcome to Reportanalyser API',
    status: 'running',
    environment: process.env.NODE_ENV,
    port: port,
    timestamp: new Date().toISOString()
  });
});

// Simple health HTML for manual checks
app.get('/health', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'health.html'));
});

// Favicon route
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favico.txt'));
});

// Serve the main HTML file for all other routes to support client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Reportanalyser app listening at http://0.0.0.0:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Public directory: ${path.join(__dirname, 'public')}`);
}); 