const express = require('express');
const app = express();
const port = process.env.PORT || 3005;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Reportanalyser API',
    status: 'running',
    environment: process.env.NODE_ENV,
    port: port
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Reportanalyser app listening at http://0.0.0.0:${port}`);
}); 