async function testAlimtalk() {
  try {
    const response = await fetch('http://localhost:3000/api/send-alimtalk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientPhone: '+821012345678',
        templateId: 'TEST_TEMPLATE_001',
        message: {
          title: '테스트 알림',
          body: '안전점검 알림이 도착했습니다'
        }
      })
    });

    const result = await response.json();
    console.log('API 응답:', result);
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testAlimtalk();