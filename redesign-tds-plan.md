# TDS 전면 리디자인 계획 (Lv3)

목표. 토스 디자인 시스템(TDS) 원칙에 맞춰 SafeOn UI를 통일한다. 이미 정의된 토스 토큰(`--primary:#3182F6` 등)으로 화면 간 색 분열을 제거하고, 타이포 스케일·컴포넌트 일관성을 확보한다.

기준 문서. 첨부된 Apps-in-Toss design.md/components.md의 TDS 원칙(토스 블루 primary, 넉넉한 패딩·라운드, ListRow/Top 컴포넌트 일관성, 텍스트 일반형/포스트형 2종).

대상. `css/style.css` (6,621줄), `index.html` (theme-color·인라인 색).

## 색상 매핑 테이블 (레거시 → 토큰)

### 블루 (Phase 1 — 명백, 안전)
| 레거시 | → 토큰 | 역할 |
|--------|--------|------|
| `#1a73e8` `#4285f4` `#2563eb` | `var(--primary)` #3182F6 | 기본 블루 |
| `#1565c0` `#0d47a1` `#1557b0` `#1a237e` | `var(--primary-dark)` #1B64DA | 진한 블루/그라데 끝 |
| `#e8f0fe` `#e8eaf6` `#c5d5f7` `#f0f4ff` `#eff6ff` | `var(--primary-light)` #EBF2FF | 연한 블루 배경 |

### 시맨틱 상태색 (Phase 2 — 비교적 안전)
| 레거시 | → 토큰 | 역할 |
|--------|--------|------|
| `#2e7d32` `#1b5e20` `#1e8e3e` `#34a853` `#137333` | `var(--success)` #15A86B | 성공/완료 |
| `#e8f5e9` `#e6f4ea` `#f1f8e9` `#a5d6a7` `#c8e6c9` | `var(--success-light)` #E6F7EF | 연한 그린 배경 |
| `#e65100` `#bf360c` `#f57c00` `#f9ab00` `#b06000` `#ffa000` | `var(--warning)` #FF9500 | 경고 |
| `#ffe082` `#ffcc80` `#fef7e0` `#fff8e1` | `var(--warning-light)` #FFF3E0 | 연한 앰버 배경 |
| `#c62828` `#d93025` `#c5221f` `#b71c1c` `#e53935` `#dc2626` | `var(--danger)` #F04452 | 위험/긴급 |
| `#fce8e6` `#f5c2c1` `#ffcdd2` `#ffebee` `#fecaca` `#ef9a9a` | `var(--danger-light)` #FEECEE | 연한 레드 배경 |

### 뉴트럴 (Phase 2)
| 레거시 | → 토큰 |
|--------|--------|
| `#f8f9fa` `#f8fafc` | `var(--gray-50)` |
| `#dadce0` `#bbb` | `var(--gray-300)` |
| `#5f6368` `#888` `#64748b` | `var(--gray-600)` |
| `#94a3b8` `#555` | `var(--gray-500)` |
| `#1e293b` `#475569` | `var(--gray-800)`/`#4E5968` |

### ⚠️ 결정 필요 — 카테고리 액센트 (Phase 3)
| 레거시 | 추정 용도 | 옵션 |
|--------|-----------|------|
| `#6a1b9a` `#8e24aa` `#f3e5f5` (보라) | 특정 메뉴/기능 액센트 | (A) 토큰화해 유지 (B) primary로 통일 |
| `#0d9488` `#f0fdfa` `#f0fdf4` (틸) | 특정 메뉴/기능 액센트 | (A) 유지 (B) 통일 |

→ TDS는 단일 primary 중심이라 (B) 통일이 정석이나, 메뉴 구분에 색을 쓰고 있으면 (A)가 UX상 나을 수 있음. 사용자 확인 후 진행.

## 단계 체크리스트
- [x] Phase 1. 블루 통일 (style.css 블루 65건 + index.html/manifest theme-color) — 검증 완료
- [x] Phase 2. 시맨틱 상태색 + 뉴트럴 통일 (278건) — 검증 완료
- [x] Phase 3. 카테고리 액센트 → primary 평탄화 (121건, 중대재해는 danger 보정) — 검증 완료
- [x] 결과: style.css/index.html/manifest 비토큰 hex **0개**, 중괄호 균형 유지, 캐시 v62
- [ ] Phase 4. 타이포 스케일 토큰(--text-*) 도입 + 11px↓ 가독성 정리
- [ ] Phase 5. ListRow·카드·버튼 TDS 컴포넌트화 + 모션 정리
- [ ] 배포 후 실제 화면 회귀 확인 (보라/틸 평탄화로 인한 단조로움 점검)

## Phase 3 평탄화 결정 기록
사용자 선택. 카테고리/심각도 색을 **primary/시맨틱으로 평탄화** (새 액센트 토큰 미생성).
- 보라(중대재해·기록마커·Tailscale) → primary 계열, 단 **중대재해 버튼만 danger 보정**.
- 틸 → primary 계열, 블루 틴트 → primary-light.
- 부작용. 사고유형 4종이 warning×2/danger×2로 수렴, 이력 기록종류 마커 색 구분 약화 → 의도된 트레이드오프.

## 원칙
1. 운영 중인 현장 앱 — 단계별 + 검증 후 진행. 한 번에 전체 sed 금지.
2. 의미 없는 값 변경 금지 — 의도된 카테고리 색은 사용자 확인.
3. index.html 인라인 카테고리 색(메뉴 아이콘)은 Phase 3에서 일괄 처리.
