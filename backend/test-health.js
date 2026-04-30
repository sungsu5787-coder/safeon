const http = require('http');

const req = http.get('http://localhost:3000/api/health', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (d) => {
    console.log('Response:', d.toString());
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});