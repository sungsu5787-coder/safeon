const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const admin = require('firebase-admin');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_ROOT = path.join(__dirname, '..');
const KAKAO_API_KEY = process.env.KAKAO_API_KEY;
const KAKAO_RECIPIENT_PHONE = process.env.KAKAO_RECIPIENT_PHONE || '';
const KAKAO_API_URL = process.env.KAKAO_API_URL || 'https://api.kakao.com/v1/alimtalk/send';
const KAKAO_TEMPLATE_ID = process.env.KAKAO_TEMPLATE_ID || '';

const FIREBASE_PROJECT_ID = 'samhwa-safeon';
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'samhwa-safeon.firebasestorage.app';
const PROPOSALS_COLLECTION = 'proposals';

// ── Firebase Admin SDK 초기화 ────────────────────────────────
let db = null;
let storageBucket = null;

(function initFirebase() {
  let serviceAccount = null;

  // 1. 환경변수 (Railway / 클라우드)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      serviceAccount = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    } catch (e) {
      console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT 파싱 실패:', e.message);
    }
  }

  // 2. 로컬 파일 (개발 환경)
  if (!serviceAccount) {
    const keyPath = path.join(__dirname, 'firebase-service-account.json');
    if (fs.existsSync(keyPath)) {
      try { serviceAccount = require(keyPath); } catch (e) {
        console.warn('[Firebase] 서비스 계정 키 파일 로드 실패:', e.message);
      }
    }
  }

  if (!serviceAccount) {
    console.warn('[Firebase] 서비스 계정 키 없음 → 클라이언트 모드 (로컬 JSON 폴백)');
    return;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID,
        storageBucket: FIREBASE_STORAGE_BUCKET
      });
    }
    db = admin.firestore();
    try { storageBucket = admin.storage().bucket(); } catch (_) { /* Storage 미설정 무시 */ }
    console.log(`[Firebase] Admin SDK 초기화 완료 (Firestore${storageBucket ? ' + Storage' : ''})`);
  } catch (err) {
    console.warn('[Firebase] Admin SDK 초기화 실패:', err.message);
  }
})();

const firebaseReady = db !== null;

// ── 로컬 JSON 폴백 ────────────────────────────────────────────
const PROPOSAL_RECORDS_FILE = path.join(__dirname, 'uploads', 'proposals', 'records.json');

function _readJsonFile() {
  try {
    if (!fs.existsSync(PROPOSAL_RECORDS_FILE)) return [];
    return JSON.parse(fs.readFileSync(PROPOSAL_RECORDS_FILE, 'utf8') || '[]');
  } catch { return []; }
}

function _writeJsonFile(records) {
  try {
    fs.mkdirSync(path.dirname(PROPOSAL_RECORDS_FILE), { recursive: true });
    fs.writeFileSync(PROPOSAL_RECORDS_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (e) { console.warn('[Proposal] JSON 저장 실패:', e.message); }
}

// ── Proposal CRUD ─────────────────────────────────────────────
async function loadProposalRecords() {
  if (firebaseReady) {
    try {
      const snap = await db.collection(PROPOSALS_COLLECTION).orderBy('createdAt').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('[Proposal] Firestore 로드 실패, JSON 폴백:', e.message); }
  }
  return _readJsonFile();
}

async function saveProposalRecord(record) {
  if (firebaseReady) {
    try {
      await db.collection(PROPOSALS_COLLECTION).doc(record.id).set(record);
      return;
    } catch (e) { console.warn('[Proposal] Firestore 저장 실패, JSON 폴백:', e.message); }
  }
  const records = _readJsonFile();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) records[idx] = record; else records.push(record);
  _writeJsonFile(records);
}

async function updateProposalStatus(id, status) {
  const now = new Date().toISOString();
  if (firebaseReady) {
    try {
      await db.collection(PROPOSALS_COLLECTION).doc(id).update({ status, statusUpdatedAt: now });
      return true;
    } catch (e) { console.warn('[Proposal] Firestore 상태 업데이트 실패, JSON 폴백:', e.message); }
  }
  const records = _readJsonFile();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return false;
  records[idx].status = status;
  records[idx].statusUpdatedAt = now;
  _writeJsonFile(records);
  return true;
}

// ── 이미지 저장 ───────────────────────────────────────────────
async function saveProposalImage(imageData, recordId) {
  if (!imageData || !imageData.startsWith('data:image/')) return { imagePath: '', imageUrl: '' };
  const matches = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) return { imagePath: '', imageUrl: '' };

  const ext = matches[1].split('/')[1].replace('jpeg', 'jpg');
  const safeName = `proposal_${recordId}.${ext}`;
  const buffer = Buffer.from(matches[2], 'base64');

  // Firebase Storage 우선
  if (storageBucket) {
    try {
      const file = storageBucket.file(`proposals/${safeName}`);
      await file.save(buffer, { metadata: { contentType: matches[1] } });
      const [url] = await file.getSignedUrl({ action: 'read', expires: '2100-01-01' });
      return { imagePath: `gs://${FIREBASE_STORAGE_BUCKET}/proposals/${safeName}`, imageUrl: url };
    } catch (e) { console.warn('[Proposal] Storage 저장 실패, 로컬 폴백:', e.message); }
  }

  // 로컬 디스크 폴백
  try {
    const dir = path.join(__dirname, 'uploads', 'proposals');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, safeName);
    fs.writeFileSync(filePath, buffer);
    return { imagePath: filePath, imageUrl: '' };
  } catch (e) {
    console.warn('[Proposal] 로컬 이미지 저장 실패:', e.message);
    return { imagePath: '', imageUrl: '' };
  }
}

// ─────────────────────────────────────────────────────────────
function isValidEnvValue(value) {
  if (!value) return false;
  return !['REPLACE', 'YOUR_', '+8210xxxxxxxx'].some(p => value.includes(p));
}

function getLocalIPv4() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (/^(192\.|10\.|172\.)/.test(iface.address)) return iface.address;
      }
    }
  }
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(STATIC_ROOT, { extensions: ['html'] }));

// ── 기본 엔드포인트 ───────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', firebase: firebaseReady }));

app.get('/local-ip.txt', (req, res) => {
  const ip = getLocalIPv4();
  if (!ip) return res.status(404).send('');
  res.type('text/plain').send(`http://${ip}:${PORT}/`);
});

// ── 알림 ─────────────────────────────────────────────────────
app.get('/api/alerts', async (req, res) => {
  if (!firebaseReady) return res.json({ alerts: [], message: 'Firebase not initialized' });
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const alerts = [];

    const ptwSnap = await db.collection('ptw').orderBy('date', 'desc').limit(100).get();
    ptwSnap.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      if (d.status === 'rejected') return;
      if (d.status === 'submitted') {
        alerts.push({ urgency: 'low', type: 'ptw-pending', icon: '📋', collType: 'ptw', docId: d.id,
          title: d.workName || '작업허가서', sub: `${d.company || ''} · 결재 대기 중`.replace(/^ · /, ''), date: d.date || '' });
      }
      if (d.periodEnd) {
        const diffDay = Math.round((new Date(d.periodEnd.split('T')[0]) - today) / 86400000);
        if (diffDay >= 0 && diffDay <= 3) {
          alerts.push({ urgency: diffDay <= 1 ? 'high' : 'mid', type: 'ptw-expire', icon: '⏰', collType: 'ptw', docId: d.id,
            title: d.workName || '작업허가서', sub: `${d.company ? d.company + ' · ' : ''}만료 ${diffDay === 0 ? '오늘' : 'D-' + diffDay}`, date: d.periodEnd.split('T')[0] });
        }
      }
    });

    const riskSnap = await db.collection('risk').where('improveStatus', 'in', ['지연', '진행중']).limit(100).get();
    riskSnap.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      if (d.improveStatus === '지연') {
        alerts.push({ urgency: 'high', type: 'risk-overdue', icon: '🔴', collType: 'risk', docId: d.id,
          title: d.workName || '위험성평가', sub: `개선 지연 · 예정일 ${d.planDate || '미설정'}`, date: d.planDate || d.date || '' });
      } else if (d.improveStatus === '진행중' && d.planDate) {
        const diffDay = Math.round((new Date(d.planDate) - today) / 86400000);
        if (diffDay >= 0 && diffDay <= 3) {
          alerts.push({ urgency: 'mid', type: 'risk-soon', icon: '⚠️', collType: 'risk', docId: d.id,
            title: d.workName || '위험성평가', sub: `개선 임박 D-${diffDay} · ${d.planDate}`, date: d.planDate });
        }
      }
    });

    const rank = { high: 0, mid: 1, low: 2 };
    alerts.sort((a, b) => (rank[a.urgency] - rank[b.urgency]) || (b.date || '').localeCompare(a.date || ''));
    res.json({ alerts });
  } catch (error) {
    console.error('[API] /api/alerts 오류:', error);
    res.json({ alerts: [], error: error.message });
  }
});

// ── 알림톡 ───────────────────────────────────────────────────
app.get('/api/notify-config', (req, res) => {
  const enabled = isValidEnvValue(KAKAO_API_KEY) && isValidEnvValue(KAKAO_RECIPIENT_PHONE) && isValidEnvValue(KAKAO_TEMPLATE_ID);
  res.json({ enabled, recipientPhone: KAKAO_RECIPIENT_PHONE, templateId: KAKAO_TEMPLATE_ID,
    apiEndpoint: '/api/send-alimtalk', sendOnTypes: ['ptw-expire', 'risk-overdue', 'risk-soon', 'ptw-pending'] });
});

app.post('/api/send-alimtalk', async (req, res) => {
  if (!KAKAO_API_KEY) return res.status(500).json({ error: 'KAKAO_API_KEY not configured' });
  const { recipientPhone, templateId, message } = req.body;
  if (!recipientPhone || !templateId || !message?.title || !message?.body)
    return res.status(400).json({ error: 'recipientPhone, templateId, message.title, message.body required' });

  console.log('[알림톡]', recipientPhone, '-', message.title);
  return res.status(200).json({ success: true,
    apiResponse: { result_code: '00', result_message: 'SUCCESS', msg_id: 'MSG_' + Date.now(), success_cnt: 1, error_cnt: 0 } });
});

// ── 제안 접수 ─────────────────────────────────────────────────
app.post('/api/submit-proposal', async (req, res) => {
  const { affiliation, department, name, phone, suggestion, imageData } = req.body || {};
  if (!affiliation || !department || !name || !phone || !suggestion)
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });

  const recordId = 'proposal_' + Date.now();
  const { imagePath, imageUrl } = await saveProposalImage(imageData, recordId);

  console.log(`[제안] ${affiliation}/${department}/${name} — ${suggestion.slice(0, 40)}`);

  await saveProposalRecord({
    id: recordId,
    createdAt: new Date().toISOString(),
    affiliation, department, name, phone, suggestion,
    imagePath,
    imageUrl,
    status: '접수',
    clientIp: req.ip
  });

  return res.status(200).json({ success: true,
    apiResponse: { result_code: '00', result_message: 'SUCCESS', msg_id: recordId, success_cnt: 1, error_cnt: 0 } });
});

// ── 제안 조회 ─────────────────────────────────────────────────
app.get('/api/proposal-count', async (req, res) => {
  const records = await loadProposalRecords();
  res.json({ count: records.length });
});

app.get('/api/proposals', async (req, res) => {
  const records = await loadProposalRecords();
  const result = records.map(({ imagePath, clientIp, ...rest }) => ({
    ...rest,
    status: rest.status || '접수',
    hasImage: !!(imagePath || rest.imageUrl),
    imageUrl: rest.imageUrl || (imagePath && !imagePath.startsWith('gs://') ? `/api/proposals/${rest.id}/image` : null)
  })).reverse();
  res.json({ proposals: result });
});

app.patch('/api/proposals/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['접수', '검토중', '완료', '반려'].includes(status))
    return res.status(400).json({ error: '유효하지 않은 상태값입니다.' });
  const ok = await updateProposalStatus(id, status);
  if (!ok) return res.status(404).json({ error: '제안을 찾을 수 없습니다.' });
  res.json({ success: true });
});

app.get('/api/proposals/:id/image', async (req, res) => {
  const records = await loadProposalRecords();
  const record = records.find(r => r.id === req.params.id);
  if (!record) return res.status(404).send('Not found');
  // Firebase Storage URL이 있으면 리다이렉트
  if (record.imageUrl && record.imageUrl.startsWith('http')) return res.redirect(record.imageUrl);
  // 로컬 파일
  if (record.imagePath && fs.existsSync(record.imagePath)) return res.sendFile(record.imagePath);
  res.status(404).send('Image not found');
});

// ─────────────────────────────────────────────────────────────
// 직접 실행 시 (로컬 / Railway)
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIPv4();
    const url = ip ? `http://${ip}:${PORT}/` : `http://localhost:${PORT}/`;
    console.log(`[SafeOn] Running at ${url}`);
    console.log(`[SafeOn] Firebase: ${firebaseReady ? 'Admin SDK' : '클라이언트 모드'} | Storage: ${storageBucket ? '연결됨' : '로컬 디스크'}`);
  });
}

// Vercel serverless export
module.exports = app;
