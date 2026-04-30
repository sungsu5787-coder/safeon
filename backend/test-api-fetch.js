const fetch = globalThis.fetch || require('node-fetch');

(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/send-alimtalk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientPhone: '+821012345678',
        templateId: 'TEST_TEMPLATE_001',
        message: {
          title: '알림톡 테스트',
          body: 'SafeOn 알림 시스템 테스트 메시지입니다.'
        }
      })
    });
    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Body:', data);
  } catch (error) {
    console.error('Error:', error);
  }
})();