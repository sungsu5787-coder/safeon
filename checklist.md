<!-- admin 종합관리 페이지(1단계) 작업 체크리스트 -->
# admin 종합관리 페이지 — 1단계 체크리스트

## 백엔드 (backend/server.js)
- [x] `crypto` 모듈 require 추가
- [x] `ADMIN_PASSWORD` 환경변수 로드 (미설정 시 로컬용 기본값 + 경고)
- [x] stateless 토큰 서명/검증 함수 (`signAdminToken` / `verifyAdminToken`, HMAC + 만료)
- [x] `requireAdmin` 미들웨어 (Authorization: Bearer 검증, 401)
- [x] `POST /api/admin/login` — 비밀번호 검증 후 토큰 발급
- [x] `GET /api/admin/stats` (보호됨) — 컬렉션별 집계 통계
- [x] 컬렉션 전체 로드 헬퍼 (`_fetchAll`: Admin SDK 우선, REST 폴백)

## 프론트엔드
- [x] 하단 네비 "이력" 버튼 → "관리"(`data-page="admin"`), 아이콘 교체 (index.html)
- [x] `titles` 맵에 `admin: '종합관리'` 추가 (app.js)
- [x] `navigateTo` 후처리에 `if (page === 'admin') Admin.onPageShow();` 추가 (app.js)
- [x] `<section id="page-admin">` 추가 — 로그인 게이트 + 대시보드
- [x] `js/admin.js` 신규 — Admin 모듈 (login/logout/onPageShow/통계 렌더)
- [x] index.html에 `<script src="js/admin.js">` 추가
- [x] css/style.css에 admin 스타일 추가 (로그인 박스, 통계 카드 그리드)
- [x] 캐시 버전 v36 → v37 (새 자산 강제 반영)

## 환경/문서
- [x] `.env.example`에 `ADMIN_PASSWORD` 추가

## 검증
- [x] 서버 재시작 후 `/api/admin/login` 정상/오류 비밀번호 동작 확인 (정답 토큰 발급, 오답 401)
- [x] `/api/admin/stats` 토큰 없이 401, 토큰 있을 때 데이터 반환 확인
- [x] 변경된 정적 자산(admin 버튼·섹션·admin.js) 서버 서빙 확인
- [ ] 브라우저에서 관리 탭 → 로그인 → 통계 표시 → 제안관리/게스트권한 이동 확인 (사용자 육안 확인 필요)
- [ ] 게스트 모드 URL에서 관리 버튼 미노출 확인 (사용자 육안 확인 필요)

## 2단계 (남은 과제)
- [ ] 진짜 사용자 계정·역할(RBAC) 관리
- [ ] 제안관리 등 변경 API에 서버 인증 적용

---
# 홈 상단 핵심지표 위젯 — 체크리스트
- [x] index.html: 그리팅 아래 KPI 카드 3종 마크업 추가 (무사고 연속일수 / 미결 위험요인 / 승인대기 PTW)
- [x] css/style.css: `.home-kpi-*` 스타일 추가
- [x] app.js: `loadHomeMetrics()` 추가 + `init()`에서 호출
- [x] 검증: 헤드리스 모바일 스크린샷으로 3종 값 렌더 확인 (무사고 6일·미결 3건·PTW 0건, 오버플로 없음)
- [x] 버전 v39→v40 / 1.3.0→1.4.0 (index.html V·SW_URL, sw.js CACHE_VER, package.json, changelog.json)

---
# 홈 화면 가독성 리디자인 (v1.5.0) — 체크리스트
- [x] index.html: 홈 블록 순서 재배치 (KPI → 바로가기 → 안전관리 → 대시보드 → 접속·QR)
- [x] index.html: 섹션 타이틀 `.home-section-title` 2종 추가 (바로가기 / 안전관리)
- [x] index.html: 접속주소+제안QR을 하단 `<details class="home-utility">`로 묶어 기본 접힘 처리
- [x] index.html: 불필요해진 `access-url-show-btn`/`access-url-hide-btn` 정리 (JS 호출부도 제거, 함수 본체는 null-가드 보존)
- [x] css/style.css: `.home-section-title`, `.home-utility` 스타일 추가 + `.home-kpi`/여백 리듬 강화
- [x] 버전 v40→v41 / 1.4.0→1.5.0 (index.html V·SW_URL, sw.js CACHE_VER, package.json, changelog.json)
- [x] 검증: node --check(app.js)·JSON 유효성·태그 균형(details 1/1, section 13/13) 통과
- [ ] 검증: 브라우저(모바일 폭)에서 순서·접힘·섹션 구분 육안 확인 (사용자 확인 필요)
