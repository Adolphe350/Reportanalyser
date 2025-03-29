const express = require('express');
const app = express();
const port = process.env.PORT || 9000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reportanalyser - Emergency Mode</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .emergency { background-color: #ffeeee; border: 1px solid #ffaaaa; padding: 20px; border-radius: 5px; }
        h1 { color: #cc0000; }
      </style>
    </head>
    <body>
      <div class="emergency">
        <h1>Emergency Mode Active</h1>
        <p>The application is running in emergency mode. This means there was an issue with the main application files.</p>
        <p>Server information:</p>
        <ul>
          <li>Node.js version: ${process.version}</li>
          <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
          <li>Port: ${port}</li>
          <li>Time: ${new Date().toISOString()}</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'running',
    mode: 'emergency',
    time: new Date().toISOString()
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[EMERGENCY MODE] App listening at http://0.0.0.0:${port}`);
}); 