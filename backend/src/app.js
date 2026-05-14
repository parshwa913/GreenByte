const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS configuration - handle preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'GreenByte Backend Successfully Deployed',
    version: 'v1',
    apiRoot: '/api/v1'
  });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
