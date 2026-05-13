const fetch = require('node-fetch');

async function testAPI() {
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
          title: 'PTW 만료 임박',
          body: '작업허가서가 곧 만료됩니다. 확인해주세요.'
        }
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();