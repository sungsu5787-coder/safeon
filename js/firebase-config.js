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

var collections = {
  tbm:       db.collection('tbm'),
  risk:      db.collection('risk'),
  checklist: db.collection('checklist'),
  workplan:  db.collection('workplan'),
  ptw:       db.collection('ptw'),
  accident:  db.collection('accident')
};

console.log('[Firebase] Firestore 초기화 완료');
