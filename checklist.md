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

---
# 사용자 계정·권한 시스템 (RBAC 1단계 MVP) — 체크리스트
결정: 작성자=로그인 후 자동기록, 범위=MVP부터. 작성자 자동기록·사람별 히스토리는 다음 단계.

## 백엔드 (backend/server.js) — Admin SDK 전용
- [x] 비번 해시 유틸: `hashPassword`(scrypt+salt) / `verifyPassword`(timingSafe)
- [x] 세션 토큰: `signSession(payload)` / `verifySession` (payload= uid·username·name·role·exp, HMAC 서명)
- [x] `requireAdmin` 세션 기반으로 업그레이드(+레거시 토큰 하위호환), `requireRole('admin')` 추가
- [x] `POST /api/auth/login` {username,password} — 검증 + 부트스트랩(users 비면 admin/ADMIN_PASSWORD로 첫 관리자 생성)
- [x] `GET /api/admin/users` (목록, 해시 제외) / `POST` (추가) / `PATCH /:id` (활성토글·비번재설정·마지막관리자 보호)
- [x] 검증: 구문 + 해시/세션 단위테스트(정상·거부·변조) PASS

## 프론트 (admin.js / index.html / css)
- [x] 로그인 폼 username+password 화 (Enter 키 이동/제출 포함)
- [x] admin 서브탭 `[통계현황] [사용자관리]` (사용자관리는 admin 역할만 노출)
- [x] 사용자관리 UI: 목록·추가폼·활성토글·비번변경(마지막관리자 보호는 서버측)
- [x] 로그인 사용자 정보 sessionStorage 저장·헤더 배지 표시
- [x] css: 서브탭·계정목록·추가폼·역할배지 스타일
- [x] 버전 v42→v43 / 1.5.1→1.6.0
- [ ] 검증: 실서버에서 로그인→계정추가→재로그인 동작 확인 (사용자 확인 필요)

## 인프라 (사용자 액션)
- [ ] Vercel 환경변수 `FIREBASE_SERVICE_ACCOUNT` 설정 확인 (Admin SDK = 계정 보안 전제)
- [ ] Firestore 보안 규칙: `users` 컬렉션 클라이언트 read/write 차단 (Firebase 콘솔)

## 2단계 — 작성자 기록 + 히스토리 (v1.7.0)
- [x] `App.stampAuthor(data)` 헬퍼 (로그인 시 createdById/createdByName 첨부, 미로그인 익명)
- [x] 6개 모듈 저장에 적용 (tbm·risk·ptw·checklist·workplan·accident)
- [x] 백엔드 `GET /api/admin/users/:id/history` (createdById 집계 + 최근 20건)
- [x] 사용자관리: 계정 행 탭 → 작업내역 모달 (종류별 건수·최근 작업)
- [x] 버전 v43→v44 / 1.6.0→1.7.0, 전체 구문 검증 통과
- [ ] 검증: 실서버에서 로그인→작성→내역 집계 확인 (사용자 확인 필요)

## 다음 개선 후보
- [ ] 로그인 진입을 홈/헤더로 노출 (부사수가 작업 전 쉽게 로그인 → 작성자 기록 실효성↑)
- [ ] 기존 무작성자 데이터 표시 처리
