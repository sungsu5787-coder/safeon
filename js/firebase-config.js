// ================================================================
// Firebase Firestore — 클라우드 실시간 동기화
// localhost:8181 과 GitHub Pages 에서 동일한 DB 사용
// ================================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDmPqngE7WIfu6ejgTE64R71IiEZz7SzuQ",
  authDomain:        "samhwa-safeon.firebaseapp.com",
  projectId:         "samhwa-safeon",
  storageBucket:     "samhwa-safeon.firebasestorage.app",
  messagingSenderId: "289570800087",
  appId:             "1:289570800087:web:ebdfd0a425a98475800b92"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 기업망·프록시가 Firestore 실시간 연결(WebChannel)을 막는 환경에서도 통하도록
// long polling 자동 감지. (무한 로딩 방지)
try { db.settings({ experimentalAutoDetectLongPolling: true }); } catch (e) { console.warn('[Firebase] settings 적용 실패:', e); }

// 익명 로그인 완료를 기다릴 수 있는 Promise — history.js 등에서 await authReady() 로 사용
var authReadyPromise = firebase.auth().signInAnonymously()
  .then(result => {
    console.log('[Auth] 익명 로그인 성공:', result.user.uid);
    return result.user;
  })
  .catch(e => {
    console.warn('[Auth] 익명 로그인 실패 (공개 접근 시도):', e.message);
    return null;
  });

var collections = {
  tbm:           db.collection('tbm'),
  risk:          db.collection('risk'),
  checklist:     db.collection('checklist'),
  workplan:      db.collection('workplan'),
  ptw:           db.collection('ptw'),
  accident:      db.collection('accident'),
  workplaceinfo: db.collection('workplaceinfo')
};

console.log('[Firebase] Firestore 초기화 완료');
