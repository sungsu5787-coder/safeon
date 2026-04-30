// 테스트 알림 데이터 추가 스크립트
const firebase = require('firebase/app');
require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDmPqngE7WIfu6ejgTE64R71IiEZz7SzuQ",
  authDomain: "samhwa-safeon.firebaseapp.com",
  projectId: "samhwa-safeon",
  storageBucket: "samhwa-safeon.firebasestorage.app",
  messagingSenderId: "289570800087",
  appId: "1:289570800087:web:ebdfd0a425a98475800b92"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 오늘 날짜
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

// PTW 만료 임박 데이터 추가
async function addTestData() {
  try {
    // PTW 만료 임박 (내일 만료)
    await db.collection('ptw').add({
      workName: '테스트 작업허가서',
      company: '테스트 회사',
      status: 'approved',
      date: today.toISOString().split('T')[0],
      periodEnd: tomorrow.toISOString().split('T')[0] + 'T23:59:59',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 위험성평가 지연 데이터 추가
    await db.collection('risk').add({
      workName: '테스트 위험성평가',
      improveStatus: '지연',
      planDate: today.toISOString().split('T')[0],
      date: today.toISOString().split('T')[0],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log('테스트 데이터 추가 완료!');
    console.log('- PTW: 내일 만료되는 작업허가서');
    console.log('- 위험성평가: 개선 지연 상태');

  } catch (error) {
    console.error('테스트 데이터 추가 실패:', error);
  }
}

addTestData();