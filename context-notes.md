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
- **무사고 연속일수**: `accident` orderBy(date desc) 1건 → 오늘-최근사고일. 사고 없으면 "사고 기록 없음". → v1.5.1에서 **무재해 기준으로 변경**(아래 참고).
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

## 무재해 연속일수 기준 변경 (2026-06-03, v1.5.1)
- **요구**: 무사고 연속일수를 산업재해(`industrial`)·중대재해(`serious`) 발생 시에만 리셋. 아차사고(`nearmiss`)·안전사고(`safety`)는 일수에 영향 없게. **집계 시작일 = 2026-01-01**(재해 없으면 1.1부터 오늘까지, 재해 나면 그날부터 재계산). 기준일 = `max(2026-01-01, 최근 재해일)`.
- **근거**: ① "무사고/무재해"는 통상 인명피해 동반 재해 기준. ② 아차사고는 장려할 예방활동인데 보고 때마다 일수가 0이 되면 보고를 위축시킴(역효과). 분리가 맞음.
- **구현**: app.js `loadHomeMetrics` 무사고 블록. 사고유형 필드명은 `accidentType`(accident.js:177). Firestore 복합 인덱스 회피 위해 `orderBy('date','desc').limit(100)`로 최근 사고를 받아 **클라이언트에서 `['industrial','serious']`만 필터**해 최신 재해일 산출. (where in + orderBy 다른 필드 = 복합 인덱스 필요하므로 회피.)
- **라벨**: "무사고 연속일수" → **"무재해 연속일수"**(index.html). 정식 용어이자 기준을 라벨이 직접 드러냄. KPI 카드가 좁아(≈100px) sub에 기준 문구를 넣으면 잘리므로 라벨로 해결. sub는 `최근 재해 {date}` / 재해 없으면 `재해 기록 없음`.
- **한계**: limit 100. 최근 사고 100건이 전부 경미사고면 그 이전 재해를 놓침(현실적으로 재해는 드물어 상위권에 노출, 사고 누적도 적어 안전). 정밀 필요 시 복합 인덱스 + where 쿼리로 전환.

## 사용자 계정·권한 시스템 RBAC (2026-06-03, 1단계 MVP 진행)
- **요구**: 개발자+부사수별 개별 아이디/비번. 누가 작업했는지 파악 + 사람별 히스토리. 관리 탭 안에서 통계와 분리된 서브탭으로.
- **사용자 결정**: ① 작성자 기록 = 로그인 후 작업(이름 자동기록, 미로그인 시 익명) ② 범위 = MVP부터(계정+로그인+사용자관리 서브탭). 작성자 자동기록·히스토리는 다음 단계.
- **현황 진단**: 코드에 세션/사용자 개념 전무(`currentUser` 등 없음). admin은 단일 `ADMIN_PASSWORD` 하나로 진입. 작성 데이터(tbm/risk/...)에 작성자 필드 없음 → 과거 데이터 소급 불가.
- **배포 구조**: 실제 백엔드 = `backend/server.js`(vercel.json이 여기로 라우팅, `api/server.js`는 미사용). Firebase는 `FIREBASE_SERVICE_ACCOUNT` env(JSON/base64) → Admin SDK, 없으면 REST 폴백(공개 키).
- **보안 핵심 결정**: `users` 컬렉션은 **Admin SDK 전용**. passwordHash가 들어있어 REST 공개키/클라 접근 시 노출되므로, 모든 users 라우트는 `firebaseReady`(Admin SDK) 없으면 503 반환. 사용자 액션 2개 전제 — ⓐ Vercel `FIREBASE_SERVICE_ACCOUNT` 설정 ⓑ Firestore 규칙에서 users 클라 차단.
- **백엔드 구현(완료)**: scrypt+salt 해시(`hashPassword`/`verifyPassword`), base64url payload + HMAC(키=ADMIN_PASSWORD) 세션 토큰(`signSession`/`verifySession`, uid·username·name·role·exp). `requireAdmin`은 세션 우선 + 레거시 단일비번 토큰 하위호환, `requireRole('admin')`. 라우트: `POST /api/auth/login`(부트스트랩: users 비면 admin/ADMIN_PASSWORD로 첫 관리자 자동생성), `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id`(활성토글·비번재설정, 마지막 관리자 보호).
- **역할**: `admin`(계정관리 가능) / `staff`(부사수, 작업만). 계정 삭제 대신 active=false 비활성화(작성 이력 보존 목적).
- **다음(프론트)**: admin.js 로그인 username화, admin 서브탭 [통계현황][사용자관리], 사용자관리 UI, 로그인정보 localStorage. → 완료(v1.6.0).
- **안전 폴백(중요)**: `/api/auth/login`은 `firebaseReady`(Admin SDK) 없으면 **레거시 단일관리자 모드**로 동작 — `admin`+ADMIN_PASSWORD면 role=admin 세션 발급(uid='legacy-admin'). 이유: FIREBASE_SERVICE_ACCOUNT 미설정 환경에 배포해도 기존 통계 로그인이 안 깨지게(회귀 방지). 이 모드에선 `/api/admin/users`가 503 → 계정 추가/목록만 잠김. 인프라 갖추면 자동으로 정식 계정 모드 전환.
- **안전 배포 순서(사용자 안내)**: ① Firestore 규칙에 users 차단 추가 → ② Vercel FIREBASE_SERVICE_ACCOUNT 설정 → ③ 그 후 첫 admin 로그인(해시 저장). 규칙을 해시 저장보다 먼저 둬야 노출 위험 0.

## 미해결/2단계
- 제안관리 등 변경 API 서버 인증 적용.
- 작성자 자동기록(createdBy) + 사람별 히스토리 (RBAC 2단계).

## FIREBASE_SERVICE_ACCOUNT 미적용 — 원인 확정 (2026-06-04)
- **증상**: RBAC users 기능이 503. 여러 번 재배포해도 Admin SDK가 안 켜짐.
- **확정 방법**: /api/health에 임시 진단 필드 추가 후 라이브(safeon0526.vercel.app) 호출.
  - 결과: `firebase:false, detail.diag={hasKey:false, rawLen:0, fireKeys:[]}, result:"no-credentials"`.
  - 배포 메타데이터는 정상(project:safeon0526, repo:sungsu5787-coder/safeon, ref:main). 즉 **올바른 프로젝트가 배포 중인데 환경변수 자체가 Production 런타임에 부재**.
- **결론**: 코드 문제 아님. `FIREBASE_SERVICE_ACCOUNT`가 Vercel `safeon0526` 프로젝트의 Production 스코프에 저장돼 있지 않음(또는 다른 스코프/다른 프로젝트에 저장). `fire` 포함 env가 0개라 어떤 형태로도 안 들어옴.
- **주의**: `safeon.vercel.app`은 전혀 다른 앱(포르투갈어 React)이 서빙됨 → 사용자가 여러 Vercel 프로젝트를 혼동해 엉뚱한 프로젝트에 env를 넣었을 가능성. 정답 도메인은 `safeon0526.vercel.app`.
- **조치**: 787dcc7에서 진단 코드 제거(=8a7f650 클린 상태로 환원). /api/health는 `{status, firebase}`만 반환.
- **남은 일(사용자 dashboard 작업 — 에이전트가 대신 못 함)**: ① Firebase 콘솔에서 서비스 계정 키 JSON 발급 ② Vercel `safeon0526` → Settings → Environment Variables에 `FIREBASE_SERVICE_ACCOUNT` = (JSON 원문 또는 base64), **Production 체크** ③ 재배포 ④ /api/health에서 `firebase:true` 확인. (배포 전 Firestore 규칙에서 users 클라 차단 먼저.)

## 사용자관리 503 오류 → 안내 패널 (2026-06-04, v1.7.3)
- **증상**: 관리 탭 사용자관리에서 "계정목록을 불러오지 못했습니다. Admin SDK가 설정되지 않았습니다" 빨간 오류.
- **원인**: FIREBASE_SERVICE_ACCOUNT 미설정 → /api/admin/users가 503 반환. 프론트가 503 메시지를 그대로 오류로 노출(admin.js loadUsers).
- **수정**: admin.js loadUsers에 `if (res.status===503)` 분기 추가 → `_renderUsersSetupNeeded()`가 친절한 안내 패널 렌더 + 작동 안 하는 "계정 추가" 버튼 숨김. css `.admin-setup-needed` 스타일 추가. 근본 활성화(서비스계정)는 별개로 사용자 dashboard 작업 필요.
- **검증**: ① 로컬 서버(Firebase 미설정 모드) → /api/health `{firebase:false}`, 레거시 admin 로그인 role=admin, /api/admin/users HTTP 503 재현 확인. ② DOM 스텁으로 admin.js loadUsers 503 분기 실행 → 안내 패널 렌더·오류문구 미노출·추가버튼 숨김 5/5 PASS.
- 캐시 v46→v47, 1.7.2→1.7.3, changelog 항목 추가.
