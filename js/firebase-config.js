// ================================================================
// Firebase Firestore — 클라우드 실시간 동기화
// 모든 기기(PC·핸드폰·태블릿)에서 동시 접속·입력 가능
// ================================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDmPqngE7WIfu6ejgTE64R71IiEZz7SzuQ",
  authDomain:        "samhwa-safeon.firebaseapp.com",
  projectId:         "samhwa-safeon",
  storageBucket:     "samhwa-safeon.firebasestorage.app",
  messagingSenderId: "289570800087",
  appId:             "1:289570800087:web:ebdfd0a425a98475800b92",
  measurementId:     "G-JTFKBC5X4B"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 전역 collections — 기존 코드와 동일한 인터페이스 유지
var collections = {
  tbm:       db.collection('tbm'),
  risk:      db.collection('risk'),
  checklist: db.collection('checklist'),
  workplan:  db.collection('workplan'),
  ptw:       db.collection('ptw'),
  accident:  db.collection('accident')
};

console.log('[Firebase] Firestore 초기화 완료 — 클라우드 실시간 동기화 활성화');
