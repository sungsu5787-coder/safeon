const http = require('http');

const payload = JSON.stringify({
  affiliation: '생산팀',
  department: '2공장 품질관리',
  name: '홍길동',
  phone: '010-1234-5678',
  suggestion: '작업장 바닥에 유류가 누출되어 미끄럼 위험이 있습니다.',
  imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/submit-proposal',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Body:', body));
});

req.on('error', console.error);
req.write(payload);
req.end();