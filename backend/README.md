# SafeOn 알림톡 백엔드

이 백엔드는 SafeOn 앱에서 알림톡 전송 요청을 받고, 서버 측에서 카카오 알림톡 API를 호출합니다.

## 설정

1. `backend/.env.example`를 `backend/.env`로 복사합니다.
2. `KAKAO_API_KEY`와 `KAKAO_TEMPLATE_ID`를 채웁니다.
3. 필요하다면 `KAKAO_API_URL`을 실제 알림톡 엔드포인트로 변경합니다.

## 설치 및 실행

```bash
cd backend
npm install
npm start
```

## 앱 연결

앱을 `http://localhost:3000`에서 실행하면 `/api/send-alimtalk` 경로로 요청을 보낼 수 있습니다.

## 알림톡 API 메타데이터

이 서버는 기본적으로 다음 형식의 POST 요청을 받습니다.

```json
{
  "recipientPhone": "+821012345678",
  "templateId": "YOUR_TEMPLATE_ID",
  "message": {
    "title": "알림 제목",
    "body": "알림 내용"
  }
}
```

필요에 따라 실제 카카오 API 호출 형식을 `backend/server.js`에서 조정하세요.
