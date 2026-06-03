// Windows 한글 콘솔 출력 UTF-8 강제
if (process.platform === 'win32') {
  const { execSync } = require('child_process');
  try { execSync('chcp 65001', { stdio: 'ignore' }); } catch(e) {}
  process.stdout.setDefaultEncoding('utf8');
  process.stderr.setDefaultEncoding('utf8');
}

const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const admin = require('firebase-admin');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_ROOT = path.join(__dirname, '..');

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

// ── 관리자 인증 (서버 비밀번호 + stateless HMAC 토큰) ─────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'safeon-admin';
const ADMIN_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8시간
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[Admin] ADMIN_PASSWORD 미설정 → 로컬 기본값 사용 (배포 시 반드시 환경변수 설정)');
}

function signAdminToken() {
  const exp = Date.now() + ADMIN_TOKEN_TTL_MS;
  const sig = crypto.createHmac('sha256', ADMIN_PASSWORD).update(String(exp)).digest('hex');
  return `${exp}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [expStr, sig] = token.split('.');
  const exp = parseInt(expStr, 10);
  if (!exp || Date.now() > exp) return false;
  const expected = crypto.createHmac('sha256', ADMIN_PASSWORD).update(expStr).digest('hex');
  const a = Buffer.from(sig, 'hex'), b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!verifyAdminToken(token)) return res.status(401).json({ error: '인증이 필요합니다.' });
  next();
}

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

// ── Firestore REST API 폴백 (Admin SDK 없을 때) ───────────────
const FIRESTORE_API_KEY = 'AIzaSyDmPqngE7WIfu6ejgTE64R71IiEZz7SzuQ';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function _toFsFields(obj) {
  const f = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (typeof v === 'string') f[k] = { stringValue: v };
    else if (typeof v === 'boolean') f[k] = { booleanValue: v };
    else if (typeof v === 'number') f[k] = { integerValue: String(v) };
  }
  return f;
}

function _fromFsDoc(doc) {
  const id = doc.name.split('/').pop();
  const obj = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    if ('stringValue' in v) obj[k] = v.stringValue;
    else if ('booleanValue' in v) obj[k] = v.booleanValue;
    else if ('integerValue' in v) obj[k] = parseInt(v.integerValue);
    else if ('doubleValue' in v) obj[k] = v.doubleValue;
  }
  return obj;
}

async function _fsGetAll(col) {
  let docs = [], pageToken = null;
  do {
    const url = `${FIRESTORE_URL}/${col}?key=${FIRESTORE_API_KEY}&pageSize=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Firestore REST error');
    (data.documents || []).forEach(d => docs.push(_fromFsDocDeep(d)));
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return docs;
}

async function _fsPatch(col, id, obj, masks) {
  const qs = masks ? '&' + masks.map(m => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&') : '';
  const url = `${FIRESTORE_URL}/${col}/${id}?key=${FIRESTORE_API_KEY}${qs}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: _toFsFields(obj) })
  });
  return res.ok;
}

// ── Proposal CRUD ─────────────────────────────────────────────
async function loadProposalRecords() {
  if (firebaseReady) {
    try {
      const snap = await db.collection(PROPOSALS_COLLECTION).orderBy('createdAt').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('[Proposal] Firestore Admin 로드 실패:', e.message); }
  }
  try {
    const docs = await _fsGetAll(PROPOSALS_COLLECTION);
    return docs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  } catch (e) { console.warn('[Proposal] Firestore REST 로드 실패, JSON 폴백:', e.message); }
  return _readJsonFile();
}

async function saveProposalRecord(record) {
  if (firebaseReady) {
    try {
      await db.collection(PROPOSALS_COLLECTION).doc(record.id).set(record);
      return;
    } catch (e) { console.warn('[Proposal] Firestore Admin 저장 실패:', e.message); }
  }
  try {
    await _fsPatch(PROPOSALS_COLLECTION, record.id, record);
    return;
  } catch (e) { console.warn('[Proposal] Firestore REST 저장 실패, JSON 폴백:', e.message); }
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
    } catch (e) { console.warn('[Proposal] Firestore Admin 상태 업데이트 실패:', e.message); }
  }
  try {
    const ok = await _fsPatch(PROPOSALS_COLLECTION, id, { status, statusUpdatedAt: now }, ['status', 'statusUpdatedAt']);
    if (ok) return true;
  } catch (e) { console.warn('[Proposal] Firestore REST 상태 업데이트 실패:', e.message); }
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
    } catch (e) { console.warn('[Proposal] Storage 저장 실패, 폴백:', e.message); }
  }

  // Vercel 서버리스 환경: data URL로 Firestore에 함께 저장
  if (process.env.VERCEL) {
    return { imagePath: '', imageUrl: imageData };
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
  if (!firebaseReady) return res.status(503).json({ alerts: [], message: 'Firebase not initialized' });
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

    // in 연산자 대신 == 두 번으로 분리 — 복합 인덱스 불필요
    const [delayedSnap, inProgressSnap] = await Promise.all([
      db.collection('risk').where('improveStatus', '==', '지연').limit(100).get(),
      db.collection('risk').where('improveStatus', '==', '진행중').limit(100).get()
    ]);
    const processRisk = doc => {
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
    };
    delayedSnap.forEach(processRisk);
    inProgressSnap.forEach(processRisk);

    const todayStr   = today.toISOString().split('T')[0];
    const weekAgo    = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // TBM 오늘 미실시 확인
    const tbmTodaySnap = await db.collection('tbm').where('date', '==', todayStr).limit(1).get();
    if (tbmTodaySnap.empty) {
      alerts.push({ urgency: 'low', type: 'tbm-missing', icon: '📣', collType: 'tbm', docId: '',
        title: 'TBM 미실시', sub: '오늘 TBM 기록이 없습니다', date: todayStr });
    }

    // 안전점검 — 불량 항목 + 유형별 미실시 (단일 쿼리로 처리)
    const monthAgo    = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];
    const clSnap = await db.collection('checklist').where('date', '>=', monthAgoStr).limit(200).get();
    const doneToday = new Set(), doneWeek = new Set(), doneMonth = new Set();
    clSnap.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      if (d.typeCode && d.date === todayStr)    doneToday.add(d.typeCode);
      if (d.typeCode && d.date >= weekAgoStr)   doneWeek.add(d.typeCode);
      if (d.typeCode)                            doneMonth.add(d.typeCode);
      const hasFail = d.results && Object.values(d.results).some(v => v === 'fail');
      if (hasFail && d.date >= weekAgoStr) {
        alerts.push({ urgency: 'mid', type: 'checklist-fail', icon: '❗', collType: 'checklist', docId: d.id,
          title: d.type || '안전점검', sub: `불량 항목 · ${d.location || d.date || ''}`.replace(/ · $/, ''), date: d.date || '' });
      }
    });
    const MISSING = [
      { code: 'daily',     label: '일일 안전점검', sub: '오늘 일일 안전점검 기록이 없습니다',    done: doneToday.has('daily') },
      { code: 'weekly',    label: '주간 안전점검', sub: '이번 주 주간 안전점검 기록이 없습니다',  done: doneWeek.has('weekly') },
      { code: 'special',   label: '특별 안전점검', sub: '이번 달 특별 안전점검 기록이 없습니다',  done: doneMonth.has('special') },
      { code: 'equipment', label: '장비 점검',     sub: '이번 달 장비 점검 기록이 없습니다',      done: doneMonth.has('equipment') },
      { code: 'fire',      label: '소방안전점검',  sub: '이번 달 소방안전점검 기록이 없습니다',   done: doneMonth.has('fire') },
    ];
    MISSING.forEach(({ code, label, sub, done }) => {
      if (!done) alerts.push({ urgency: 'low', type: `checklist-missing-${code}`, icon: '📋',
        collType: 'checklist', docId: '', title: `${label} 미실시`, sub, date: todayStr });
    });

    // 사고 — 최근 7일 내 산업재해·중대재해·안전사고
    const accSnap = await db.collection('accident').where('date', '>=', weekAgoStr).limit(50).get();
    accSnap.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      const sub = `${d.location || ''} · ${d.date || ''}`.replace(/^ · | · $/, '');
      if (d.accidentType === 'industrial' || d.accidentType === 'serious') {
        alerts.push({ urgency: 'high', type: 'accident-serious', icon: '🚨', collType: 'accident', docId: d.id,
          title: d.accidentTypeLabel || '중대사고', sub, date: d.date || '' });
      } else if (d.accidentType === 'safety') {
        alerts.push({ urgency: 'mid', type: 'accident-safety', icon: '🩹', collType: 'accident', docId: d.id,
          title: '안전사고 발생', sub, date: d.date || '' });
      } else if (d.accidentType === 'nearmiss') {
        alerts.push({ urgency: 'low', type: 'accident-nearmiss', icon: '⚡', collType: 'accident', docId: d.id,
          title: '아차사고 발생', sub, date: d.date || '' });
      }
    });

    const rank = { high: 0, mid: 1, low: 2 };
    alerts.sort((a, b) => (rank[a.urgency] - rank[b.urgency]) || (b.date || '').localeCompare(a.date || ''));
    res.json({ alerts });
  } catch (error) {
    console.error('[API] /api/alerts 오류:', error);
    res.status(500).json({ alerts: [], error: error.message });
  }
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

// ── Firestore 문서 파싱 (중첩 객체/배열 포함) ──────────────────
function _fromFsDocDeep(doc) {
  const id = doc.name.split('/').pop();
  return { id, ...parseValue({ mapValue: { fields: doc.fields || {} } }) };
}
function parseValue(v) {
  if ('stringValue'  in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue'  in v) return v.doubleValue;
  if ('nullValue'    in v) return null;
  if ('arrayValue'   in v) return (v.arrayValue.values || []).map(parseValue);
  if ('mapValue'     in v) {
    const obj = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) obj[k] = parseValue(val);
    return obj;
  }
  return null;
}

// ── 이력 조회 API ─────────────────────────────────────────────
async function _fsQueryDateRange(col, dateFrom, dateTo) {
  try {
    if (firebaseReady) {
      let q = db.collection(col);
      if (dateFrom) q = q.where('date', '>=', dateFrom);
      if (dateTo)   q = q.where('date', '<=', dateTo);
      const snap = await q.get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) { console.warn(`[History] Admin SDK ${col} 실패:`, e.message); }
  // REST API 폴백: 전체 가져온 뒤 클라이언트 필터
  const all = await _fsGetAll(col);
  return all.filter(d => {
    if (dateFrom && (d.date || '') < dateFrom) return false;
    if (dateTo   && (d.date || '') > dateTo)   return false;
    return true;
  });
}

app.get('/api/history', async (req, res) => {
  const { type = 'all', dateFrom = '', dateTo = '' } = req.query;
  const COLS = ['tbm', 'risk', 'checklist', 'workplan', 'ptw', 'accident'];
  const targets = type === 'all' ? COLS : type === 'nearmiss' ? ['accident'] : (COLS.includes(type) ? [type] : []);

  try {
    const results = await Promise.all(targets.map(async col => {
      const docs = await _fsQueryDateRange(col, dateFrom, dateTo);
      return docs.map(d => ({ ...d, _collType: col }));
    }));
    let flat = results.flat();
    if (type === 'nearmiss') flat = flat.filter(d => d.accidentType === 'nearmiss');
    flat.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json({ records: flat });
  } catch (e) {
    console.error('[History API]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── 관리자 로그인 / 통계 ──────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  const token = signAdminToken();
  res.json({ token, expiresAt: Date.now() + ADMIN_TOKEN_TTL_MS });
});

async function _fetchAll(col) {
  if (firebaseReady) {
    try {
      const snap = await db.collection(col).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn(`[Stats] Admin SDK ${col} 실패:`, e.message); }
  }
  try { return await _fsGetAll(col); }
  catch (e) { console.warn(`[Stats] REST ${col} 실패:`, e.message); return []; }
}

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const COLS = ['tbm', 'risk', 'checklist', 'ptw', 'accident', 'workplan'];
  try {
    const [colData, proposals] = await Promise.all([
      Promise.all(COLS.map(_fetchAll)),
      loadProposalRecords()
    ]);

    const totals = {};
    COLS.forEach((c, i) => { totals[c] = colData[i].length; });
    totals.proposals = proposals.length;

    const riskDocs = colData[COLS.indexOf('risk')];
    const accDocs  = colData[COLS.indexOf('accident')];

    const countBy = (arr, key) => arr.reduce((m, d) => {
      const k = d[key] || '미분류'; m[k] = (m[k] || 0) + 1; return m;
    }, {});

    res.json({
      totals,
      proposalsByStatus: countBy(proposals.map(p => ({ status: p.status || '접수' })), 'status'),
      riskByStatus:      countBy(riskDocs, 'improveStatus'),
      accidentByType:    countBy(accDocs, 'accidentType'),
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('[Stats API]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── 제안 삭제 헬퍼 ───────────────────────────────────────────
async function deleteProposalRecord(id) {
  if (firebaseReady) {
    try {
      await db.collection(PROPOSALS_COLLECTION).doc(id).delete();
      return true;
    } catch (e) { console.warn('[Proposal] Firestore Admin 삭제 실패:', e.message); }
  }
  try {
    const url = `${FIRESTORE_URL}/${PROPOSALS_COLLECTION}/${id}?key=${FIRESTORE_API_KEY}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) return true;
  } catch (e) { console.warn('[Proposal] Firestore REST 삭제 실패:', e.message); }
  const records = _readJsonFile();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return false;
  records.splice(idx, 1);
  _writeJsonFile(records);
  return true;
}

// ── 제안 내용 수정 ────────────────────────────────────────────
app.patch('/api/proposals/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { suggestion, name, phone, affiliation, department } = req.body || {};
  const records = await loadProposalRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: '제안을 찾을 수 없습니다.' });
  const updates = {};
  if (suggestion  !== undefined) updates.suggestion  = suggestion;
  if (name        !== undefined) updates.name        = name;
  if (phone       !== undefined) updates.phone       = phone;
  if (affiliation !== undefined) updates.affiliation = affiliation;
  if (department  !== undefined) updates.department  = department;
  if (firebaseReady) {
    try { await db.collection(PROPOSALS_COLLECTION).doc(id).update(updates); }
    catch(e) { console.warn('[Proposal] Admin 수정 실패:', e.message); }
  } else {
    try { await _fsPatch(PROPOSALS_COLLECTION, id, updates, Object.keys(updates)); }
    catch(e) {
      records[idx] = { ...records[idx], ...updates };
      _writeJsonFile(records);
    }
  }
  res.json({ success: true });
});

// ── 제안 조회 ─────────────────────────────────────────────────
app.get('/api/proposal-count', async (req, res) => {
  const records = await loadProposalRecords();
  res.json({ count: records.length });
});

app.get('/api/proposals', async (req, res) => {
  const records = await loadProposalRecords();
  const result = records.map(({ imagePath, clientIp, imageUrl: rawUrl, ...rest }) => {
    const hasImage = !!(imagePath || rawUrl);
    let imageUrl = null;
    if (rawUrl && rawUrl.startsWith('http')) imageUrl = rawUrl;
    else if (hasImage) imageUrl = `/api/proposals/${rest.id}/image`;
    return { ...rest, status: rest.status || '접수', hasImage, imageUrl };
  }).reverse();
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

app.patch('/api/proposals/:id/note', async (req, res) => {
  const { id } = req.params;
  const { note } = req.body || {};
  if (typeof note !== 'string') return res.status(400).json({ error: '비고 내용이 필요합니다.' });
  const now = new Date().toISOString();
  if (db) {
    try {
      await db.collection(PROPOSALS_COLLECTION).doc(id).update({ note, noteUpdatedAt: now });
      return res.json({ success: true });
    } catch (e) { console.warn('[Proposal] Firestore Admin 비고 업데이트 실패:', e.message); }
  }
  try {
    const ok = await _fsPatch(PROPOSALS_COLLECTION, id, { note, noteUpdatedAt: now }, ['note', 'noteUpdatedAt']);
    if (ok) return res.json({ success: true });
  } catch (e) { console.warn('[Proposal] Firestore REST 비고 업데이트 실패:', e.message); }
  const records = _readJsonFile();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: '제안을 찾을 수 없습니다.' });
  records[idx].note = note;
  records[idx].noteUpdatedAt = now;
  _writeJsonFile(records);
  res.json({ success: true });
});

app.delete('/api/proposals/:id', async (req, res) => {
  const { id } = req.params;
  const ok = await deleteProposalRecord(id);
  if (!ok) return res.status(404).json({ error: '해당 기록을 찾을 수 없습니다.' });
  res.json({ success: true });
});

app.get('/api/proposals/:id/image', async (req, res) => {
  const records = await loadProposalRecords();
  const record = records.find(r => r.id === req.params.id);
  if (!record) return res.status(404).send('Not found');
  if (record.imageUrl && record.imageUrl.startsWith('http')) return res.redirect(record.imageUrl);
  if (record.imageUrl && record.imageUrl.startsWith('data:')) {
    const m = record.imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (m) {
      res.setHeader('Content-Type', m[1]);
      return res.send(Buffer.from(m[2], 'base64'));
    }
  }
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
