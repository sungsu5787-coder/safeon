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

// Firestore 보안 규칙이 auth != null 일 때도 동작하도록 익명 로그인
firebase.auth().signInAnonymously().catch(e => console.warn('[Auth] 익명 로그인 실패:', e.message));

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
