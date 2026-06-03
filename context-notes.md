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

## 모바일 안전점검현황 미표시 — 원인과 수정 (2026-06-03)
- **증상**: 폰에서 안전점검현황(safetyreport)이 구현 안 됨.
- **검증**: 헤드리스 Chrome 모바일 에뮬(360·390px)로 실제 메뉴카드 클릭 흐름 재현 → 정상 렌더(리포트 본문 7.7KB, 가로 오버플로 없음, SafetyReport 정의됨). 즉 렌더링/JS 버그 아님.
- **원인**: 설치형 PWA의 stale Service Worker. 두 가지 실제 결함.
  - sw.js `PRECACHE_FILES`에 신규 JS 5종 누락: safety-report.js, proposals-view.js, admin.js, notify.js, workplace-info.js. → 오프라인/구캐시에서 신규 페이지 깨짐.
  - `CACHE_VER='safeon-v35'`가 앱 버전 v39와 어긋남. staleWhileRevalidate가 구 index.html을 우선 반환하면 index.html 내 V 버전체크가 무력화되는 PWA 고전 함정.
- **수정**: ① sw.js CACHE_VER v35→v39 + 누락 5종 precache 추가 + 헤더 주석 v39. ② index.html SW_URL `sw.js?v=25`→`v=39`(새 SW 바이트 강제 재등록).
- **검증 결과**: 캐시 `safeon-v39-static`, 32개 precache, 신규 5종 누락 0. 모바일 렌더 정상 유지.

## 홈 핵심지표 위젯 (2026-06-03)
- 그리팅 바로 아래 KPI 카드 3종. 클릭 시 각 페이지로 이동(accident/risk/ptw), data-page로 게스트 자동 숨김.
- **무사고 연속일수**: `accident` orderBy(date desc) 1건 → 오늘-최근사고일. 사고 없으면 "사고 기록 없음".
- **미결 위험요인**: `risk` improveStatus가 지연+진행중인 doc 수. 결정 — "이번 달"이 아니라 현재 미결 전체. 이유 ① 지난달 생성도 미결이면 조치 필요 ② improveStatus+date 복합조건은 Firestore 복합 인덱스 필요한데 notify.js가 의도적으로 회피(==쿼리 2회 패턴 재사용).
- **승인대기 PTW**: `ptw` status=='submitted' doc 수(기간 무관).
- 구현 위치: app.js `loadHomeMetrics()` (init에서 loadVersionBadge 다음 호출), index.html `#home-kpi`, css `.home-kpi-*`.
- 검증: 헤드리스 390px → 무사고 6일/미결 3건(진행중3)/PTW 0건, 오버플로 없음, 예외 없음.

## 홈 화면 가독성 리디자인 (2026-06-03, v1.5.0)
- **요구**: 홈 화면 가독성 개선. 강도 = "비주얼까지 리디자인", 접속/QR 카드 = "기본 접힘".
- **진단**: 홈에 블록 9개가 비슷한 무게로 쌓여 위계 부재. 황금영역(상단)을 설정성 정보(접속주소·QR + 경고문구)가 차지. 진입점 10개(Featured 4 + 메뉴 6)가 평면 나열.
- **결정 — 색 팔레트는 유지.** 기존 Material(#1a73e8)+Slate+의미색 톤이 이미 단정. 전면 교체는 전체 앱 통일성 깨고 회귀 위험. 가독성 체감은 ① 순서 재배치 ② 섹션 타이틀 위계 ③ 여백 리듬 ④ KPI 강화에서 나온다고 판단.
- **결정 — 새 순서**: 버전바 → greeting → KPI → [바로가기] Featured 4 → [안전관리] 메뉴 6 → 대시보드 → [접속·QR] details(기본 접힘). 매일 보는 정보 위로, 설정성 정보 아래로.
- **결정 — 접속/QR 접힘은 `<details>` 네이티브 요소로.** localStorage 토글(accessCardHidden) 메커니즘을 새로 손대지 않고 `<details>`(open 없음=기본 닫힘)로 감싸 JS 변경 최소화(CLAUDE.md 단순성). 기존 `access-url-show-btn`/`hide-btn`은 details가 역할 대체 → 마크업에서 제거. 단 JS의 hideAccessCard/showAccessCard/_restore… 는 null 가드가 있어 버튼 제거해도 에러 없음, 함수 자체는 보존(회귀 회피).
- **유지**: 접속카드 내부 `access-url-toggle`(고정주소 본문 접기)와 _refreshAccessUrl/_refreshCfUrl 로직은 그대로. CF URL 30초 자동갱신도 유지.

## 미해결/2단계
- 진짜 사용자 계정·역할(RBAC).
- 제안관리 등 변경 API 서버 인증 적용.
