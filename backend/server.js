const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_ROOT = path.join(__dirname, '..');
const KAKAO_API_KEY = process.env.KAKAO_API_KEY;
const KAKAO_RECIPIENT_PHONE = process.env.KAKAO_RECIPIENT_PHONE || '';
const KAKAO_API_URL = process.env.KAKAO_API_URL || 'https://api.kakao.com/v1/alimtalk/send';
const KAKAO_TEMPLATE_ID = process.env.KAKAO_TEMPLATE_ID || '';

function isValidEnvValue(value) {
  if (!value) return false;
  const invalidPatterns = ['REPLACE', 'YOUR_', '+8210xxxxxxxx'];
  return !invalidPatterns.some(pattern => value.includes(pattern));
}

app.use(express.json());
app.use(express.static(STATIC_ROOT, { extensions: ['html'] }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/notify-config', (req, res) => {
  const enabled = isValidEnvValue(KAKAO_API_KEY) && isValidEnvValue(KAKAO_RECIPIENT_PHONE) && isValidEnvValue(KAKAO_TEMPLATE_ID);
  res.json({
    enabled,
    recipientPhone: KAKAO_RECIPIENT_PHONE,
    templateId: KAKAO_TEMPLATE_ID,
    apiEndpoint: '/api/send-alimtalk',
    sendOnTypes: ['ptw-expire', 'risk-overdue', 'risk-soon', 'ptw-pending']
  });
});

app.post('/api/send-alimtalk', async (req, res) => {
  if (!KAKAO_API_KEY) {
    return res.status(500).json({ error: 'KAKAO_API_KEY is not configured in backend/.env' });
  }

  const { recipientPhone, templateId, message } = req.body;
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

function httpRequest(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === 'https:' ? https : http;
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      port: url.port || (url.protocol === 'https:' ? 443 : 80)
    };

    const req = lib.request(reqOptions, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let body = raw;
        try {
          body = raw ? JSON.parse(raw) : raw;
        } catch (err) {
          body = raw;
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

app.listen(PORT, () => {
  console.log(`[SafeOn backend] Running at http://localhost:${PORT}`);
  console.log(`[SafeOn backend] Static app served from ${STATIC_ROOT}`);
});
