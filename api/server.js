const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const admin = require('firebase-admin');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_ROOT = path.join(__dirname, '..');
const KAKAO_API_KEY = process.env.KAKAO_API_KEY;
const KAKAO_RECIPIENT_PHONE = process.env.KAKAO_RECIPIENT_PHONE || '';
const KAKAO_API_URL = process.env.KAKAO_API_URL || 'https://api.kakao.com/v1/alimtalk/send';
const KAKAO_TEMPLATE_ID = process.env.KAKAO_TEMPLATE_ID || '';

// Firebase Admin SDK 초기화
let db = null;
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'samhwa-safeon'
      });
    }
    db = admin.firestore();
    console.log('[Firebase] Admin SDK 초기화 완료');
  } catch (err) {
    console.warn('[Firebase] Admin SDK 초기화 실패:', err.message);
    db = null;
  }
} else {
  console.warn('[Firebase] 서비스 계정 키를 찾을 수 없습니다. 클라이언트 모드로 실행됩니다.');
  db = null;
}

// Firebase Admin 초기화 없이 Firestore 접근할 수 없으므로 변수만 정의
let firebaseReady = db !== null;

function isValidEnvValue(value) {
  if (!value) return false;
  const invalidPatterns = ['REPLACE', 'YOUR_', '+8210xxxxxxxx'];
  return !invalidPatterns.some(pattern => value.includes(pattern));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(STATIC_ROOT, { extensions: ['html'] }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

function getLocalIPv4() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.') || iface.address.startsWith('10.') || iface.address.startsWith('172.')) {
          return iface.address;
        }
      }
    }
  }
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

app.get('/local-ip.txt', (req, res) => {
  const ip = getLocalIPv4();
  if (ip) {
    res.set('Content-Type', 'text/plain');
    res.send(`http://${ip}:${PORT}/`);
  } else {
    res.set('Content-Type', 'text/plain');
    res.send(`http://localhost:${PORT}/`);
  }
});

app.post('/api/send-alimtalk', async (req, res) => {
  if (!KAKAO_API_KEY || !isValidEnvValue(KAKAO_API_KEY)) {
    return res.status(500).json({ error: 'KAKAO_API_KEY is not configured' });
  }

  const { recipientPhone, templateId, message } = req.body || {};
  if (!recipientPhone || !templateId || !message || !message.title || !message.body) {
    return res.status(400).json({ error: 'recipientPhone, templateId, message.title, and message.body are required' });
  }

  // 테스트 모드: 실제 API 호출 대신 로깅
  console.log('[알림톡 전송 시뮬레이션]');
  console.log(`수신자: ${recipientPhone}`);
  console.log(`템플릿: ${templateId}`);
  console.log(`제목: ${message.title}`);
  console.log(`내용: ${message.body}`);
  console.log('---');

  // 실제 API 호출 대신 성공 응답 반환
  return res.status(200).json({
    success: true,
    apiResponse: {
      result_code: '00',
      result_message: 'SUCCESS',
      msg_id: 'TEST_MSG_' + Date.now(),
      success_cnt: 1,
      error_cnt: 0
    }
  });
});

const PROPOSAL_RECORDS_FILE = path.join(__dirname, '..', 'uploads', 'proposals', 'records.json');

function loadProposalRecords() {
  try {
    if (!fs.existsSync(PROPOSAL_RECORDS_FILE)) return [];
    const raw = fs.readFileSync(PROPOSAL_RECORDS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.warn('[Proposal] records load failed', err.message || err);
    return [];
  }
}

function saveProposalRecords(records) {
  try {
    fs.mkdirSync(path.dirname(PROPOSAL_RECORDS_FILE), { recursive: true });
    fs.writeFileSync(PROPOSAL_RECORDS_FILE, JSON.stringify(records, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('[Proposal] records save failed', err.message || err);
    return false;
  }
}

app.post('/api/submit-proposal', async (req, res) => {
  if (!KAKAO_API_KEY) {
    return res.status(500).json({ error: 'KAKAO_API_KEY is not configured in backend/.env' });
  }

  const { affiliation, department, name, phone, suggestion, imageData } = req.body || {};
  if (!affiliation || !department || !name || !phone || !suggestion || !imageData) {
    return res.status(400).json({ error: 'affiliation, department, name, phone, suggestion, and imageData are required' });
  }

  let savedImagePath = '';
  if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'proposals');
      fs.mkdirSync(uploadsDir, { recursive: true });
      const matches = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1].split('/')[1].replace('jpeg', 'jpg');
        const safeName = `proposal_${Date.now()}.${ext}`;
        const filePath = path.join(uploadsDir, safeName);
        fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
        savedImagePath = filePath;
      }
    } catch (err) {
      console.warn('[Proposal] image save failed', err);
    }
  }

  const message = {
    title: '현장안전 제안 접수',
    body: `소속:${affiliation}\n부서:${department}\n이름:${name}\n전화:${phone}\n위험제안:${suggestion}${savedImagePath ? '\n사진이 서버에 저장되었습니다' : ''}`
  };

  console.log('[제안 접수]');
  console.log(`  소속: ${affiliation}`);
  console.log(`  부서: ${department}`);
  console.log(`  이름: ${name}`);
  console.log(`  전화: ${phone}`);
  console.log(`  제안: ${suggestion}`);
  console.log(`  사진 저장: ${savedImagePath || '없음'}`);
  if (savedImagePath) console.log(`  이미지 파일: ${savedImagePath}`);

  console.log('[알림톡 전송 시뮬레이션]');
  console.log(`수신자: ${KAKAO_RECIPIENT_PHONE}`);
  console.log(`템플릿: ${KAKAO_TEMPLATE_ID}`);
  console.log(`제목: ${message.title}`);
  console.log(`내용: ${message.body}`);
  console.log('---');

  const proposalRecords = loadProposalRecords();
  proposalRecords.push({
    id: 'proposal_' + Date.now(),
    createdAt: new Date().toISOString(),
    affiliation,
    department,
    name,
    phone,
    suggestion,
    imagePath: savedImagePath,
    clientIp: req.ip
  });
  saveProposalRecords(proposalRecords);

  return res.status(200).json({
    success: true,
    apiResponse: {
      result_code: '00',
      result_message: 'SUCCESS',
      msg_id: 'PROPOSAL_' + Date.now(),
      success_cnt: 1,
      error_cnt: 0
    }
  });
});

app.get('/api/proposal-count', (req, res) => {
  const proposalRecords = loadProposalRecords();
  res.json({ count: proposalRecords.length });
});

function httpRequest(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[SafeOn backend] Running at http://localhost:${PORT}/`);
    console.log(`[SafeOn backend] Static app served from ${STATIC_ROOT}`);
  });
}

module.exports = app;