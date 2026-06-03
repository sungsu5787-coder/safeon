<!-- admin 페이지 작업 중 내린 결정과 근거 기록 -->
# Context Notes — admin 종합관리 페이지

## 배경
- 하단 네비 "이력" 버튼은 메인 메뉴 카드(`data-page="history"`, index.html:295)와 중복 진입점이라 제거해도 이력조회 기능 손실 없음 → admin 진입점으로 재활용.
- 요구: 통계 + 제안관리 + 사용자/권한 포함 종합관리 + 로그인. 단, 진짜 계정관리(RBAC)는 2단계로 분리. 1단계는 통계·제안관리·게스트권한 + 서버 비밀번호 로그인.

## 결정과 근거
- **로그인: 서버 비밀번호 + stateless HMAC 토큰.** 클라이언트 비밀번호는 JS에서 노출돼 무의미. Vercel 서버리스는 메모리 토큰 저장이 불가능하므로 in-memory 세션 대신 stateless 토큰 사용.
  - 토큰 = `${exp}.${HMAC-SHA256(key=ADMIN_PASSWORD, msg=exp)}`. 검증은 서명 재계산 + 만료 확인. 별도 저장소 불필요.
  - `ADMIN_PASSWORD` 환경변수. 미설정 시 로컬 기본값 `safeon-admin` + 콘솔 경고(기존 Firebase 키 폴백과 동일한 관용적 패턴).
- **기존 제안관리/게스트권한은 재구현하지 않고 재사용.** admin 대시보드에서 기존 `page-proposals`로 이동, 게스트 QR은 기존 QRModal 게스트 탭을 연다. 코드 최소화(CLAUDE.md 단순성).
- **기존 공개 제안관리 API(/api/proposals 상태변경 등)는 1단계에서 인증으로 막지 않음.** 막으면 메뉴 카드 "제안 관리"가 깨지고 proposals-view.js도 수정해야 해 회귀 위험. 신규 `/api/admin/stats`만 보호. → 진짜 API 잠금은 2단계 과제로 남김(사용자에게 고지 필요).
- **게스트 차단은 자동.** 게스트 권한 목록(workplan/tbm/risk/checklist/ptw/accident)에 admin이 없어 기존 `canAccess`/nav 숨김 로직이 그대로 차단. 추가 코드 불필요.

## 통계 항목 (stats API)
- 컬렉션별 총 건수: tbm, risk, checklist, ptw, accident, workplan, proposals.
- 세부: proposals 상태별, risk improveStatus별(지연/진행중/완료), accident accidentType별.

## 버전 변경 내역 (changelog) — 결정
- **정적 파일 방식 채택**: `data/changelog.json`을 직접 큐레이션해 admin 대시보드 하단 "버전 내역" 섹션에 렌더링.
  - 근거: 사용자 친화적 한국어 설명, 백엔드/네트워크 의존 없음, 기존 수동 버전 워크플로(`V`, package.json)와 자연스럽게 연결.
  - git 로그 자동 추출은 배포본(Vercel)에 `.git`이 없어 제외. GitHub Releases API는 외부 의존·릴리스 생성 부담으로 제외.
- **버전 올릴 때 절차**: ① package.json `version` ② index.html 캐시 `V` ③ `data/changelog.json` 맨 앞에 항목 추가. (이번에 1.2.0/v37 → 1.3.0/v38)
- changelog.json 배열의 첫 항목이 "현재 버전"으로 표시됨. type 값은 feat/fix/chore (배지 색 구분).
- data/**는 vercel.json includeFiles에 포함돼 배포본에서도 서빙됨.

## 미해결/2단계
- 진짜 사용자 계정·역할(RBAC).
- 제안관리 등 변경 API 서버 인증 적용.
