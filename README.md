# SafeOn - 안전보건 관리 시스템

현장 안전관리를 위한 웹 기반 안전보건 관리 시스템입니다.

## 🚀 배포 상태

- **프론트엔드**: https://sungsu5787-coder.github.io/safeon/
- **백엔드 API**: https://safeon-api.vercel.app/

## 📱 기능

- 안전사고 보고서 작성
- 위험성평가 관리
- 작업허가서(PTW) 시스템
- 안전보건 제안 접수
- TBM(작업 전 안전 미팅)
- 안전점검 관리
- 오프라인 작업 지원 (PWA)

## 🛠️ 개발 환경 설정

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev

# 백엔드 API만 실행
npm start
```

## 🌐 배포

### GitHub Pages (프론트엔드)
```bash
# main 브랜치에 푸시하면 자동 배포
git add .
git commit -m "Deploy to production"
git push origin main
```

### Vercel (백엔드 API)
```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel --prod
```

## 🔧 환경변수 설정

`.env` 파일에 다음 변수를 설정하세요:

```env
KAKAO_API_KEY=your_kakao_api_key
KAKAO_RECIPIENT_PHONE=+8210xxxxxxxx
KAKAO_API_URL=https://api.kakao.com/v1/alimtalk/send
KAKAO_TEMPLATE_ID=your_template_id
PORT=3000
```

## 📋 요구사항

- Node.js 18+
- Firebase 프로젝트 설정
- Kakao 알림톡 API 키

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.