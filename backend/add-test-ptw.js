// Firebase 초기화
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDmPqngE7WIfu6ejgTE64R71IiEZz7SzuQ",
  authDomain: "samhwa-safeon.firebaseapp.com",
  projectId: "samhwa-safeon",
  storageBucket: "samhwa-safeon.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestPTW() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const docRef = await addDoc(collection(db, 'ptw'), {
      workName: '알림톡 테스트 작업허가서',
      company: '테스트 회사',
      status: 'approved',
      date: today.toISOString().split('T')[0],
      periodEnd: tomorrow.toISOString().split('T')[0] + 'T23:59:59',
      createdAt: serverTimestamp()
    });

    console.log('✅ PTW 테스트 데이터 추가 완료! 문서 ID:', docRef.id);
    console.log('- 작업명: 알림톡 테스트 작업허가서');
    console.log('- 만료일: 내일');
    console.log('- 상태: 승인됨');
  } catch (error) {
    console.error('❌ PTW 데이터 추가 실패:', error);
  }
}

addTestPTW();