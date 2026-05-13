const http = require('http');

const data = JSON.stringify({
  recipientPhone: '+821012345678',
  templateId: 'TEST_TEMPLATE_001',
  message: {
    title: 'PTW 만료 임박',
    body: '작업허가서가 곧 만료됩니다. 확인해주세요.'
  }
});

console.log('Sending JSON:', data);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/send-alimtalk',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();