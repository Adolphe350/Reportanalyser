const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Reportanalyser API',
    status: 'running',
    environment: process.env.NODE_ENV
  });
});

app.listen(port, () => {
  console.log(`Reportanalyser app listening at http://localhost:${port}`);
}); 