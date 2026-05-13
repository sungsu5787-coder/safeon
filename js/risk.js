// ===== Risk Assessment Module — 상중하(上中下) 방법 + AI 위험통제계층 =====
const Risk = {
  itemCount: 0,
  _itemPhotos: { before: {}, after: {} },   // { before: { n: [{name,data},...] }, after: {...} }

  // ── 위험도 매트릭스 (가능성 × 심각도 → 3×3) ──────────────────
  matrix: {
    '하_하': { level:'하', desc:'허용 가능',  cls:'rl-low'  },
    '하_중': { level:'하', desc:'허용 가능',  cls:'rl-low'  },
    '하_상': { level:'중', desc:'개선 필요',  cls:'rl-med'  },
    '중_하': { level:'하', desc:'허용 가능',  cls:'rl-low'  },
    '중_중': { level:'중', desc:'개선 필요',  cls:'rl-med'  },
    '중_상': { level:'상', desc:'즉시 개선',  cls:'rl-high' },
    '상_하': { level:'중', desc:'개선 필요',  cls:'rl-med'  },
    '상_중': { level:'상', desc:'즉시 개선',  cls:'rl-high' },
    '상_상': { level:'상', desc:'즉시 개선',  cls:'rl-high' }
  },

  // ── AI 위험통제계층 DB ─────────────────────────────────────────
  hazardDB: {
    추락: {
      kw:['추락','고소','높이','사다리','비계','지붕','개구부','슬라브','작업발판','단부','가장자리'],
      본질적:['고소작업 최소화 (지상 공법 전환)','프리패브·모듈러 공법 적용','무인 장비(드론·로봇) 활용'],
      공학적:['안전난간 설치 (H≥90cm·중간대·발끝막이)','추락방지망 설치','개구부 안전덮개 고정','이동식 비계·작업대 사용'],
      행정적:['고소작업 허가제 운영','TBM 시 추락위험 공유','2인 1조 작업 원칙','작업 전 발판·난간 상태 점검'],
      보호구:['전체식 안전대 착용 (D링 상부 체결)','안전모 착용 (턱끈 체결)','안전화 착용 (미끄럼 방지)']
    },
    낙하: {
      kw:['낙하','떨어짐','자재낙하','공구낙하','투하','물체낙하','적재'],
      본질적:['상부 작업 최소화','하부 동시 작업 금지 원칙 수립'],
      공학적:['낙하물 방지망 설치','수직 보호망 설치','발끝막이판 설치 (H≥10cm)','공구·자재 안전줄 사용'],
      행정적:['낙하위험구역 출입 통제','낙하물 방지 표지 설치','자재 적치 불량 즉시 시정'],
      보호구:['안전모 착용 (내관통형)','보안면 착용','안전조끼 착용']
    },
    협착: {
      kw:['협착','끼임','압착','롤러','기어','프레스','컨베이어','회전체','동력전달'],
      본질적:['위험 공정 자동화·무인화','방호장치 내장형 설비 도입'],
      공학적:['방호덮개·가드 설치','인터록 장치 설치','비상정지 스위치 설치','안전거리 확보'],
      행정적:['LOTO(에너지 차단·잠금) 절차 이행','작업 전 설비 안전 점검','협착 위험 작업 허가제 운영'],
      보호구:['몸에 밀착된 작업복 착용','안전화 착용','안전장갑 착용 (회전부 주의)']
    },
    전기: {
      kw:['전기','감전','누전','전선','배전','전압','전류','아크','활선','충전부','분전반'],
      본질적:['저전압 설비 전환','절연형·봉함형 설비 도입','활선 작업 금지 원칙'],
      공학적:['누전차단기 설치','보호 접지 설비 설치','절연 방호구·방호관 비치','전선 절연 피복 유지'],
      행정적:['전기작업 허가제 운영','정전 작업 원칙 (LOTO)','전기작업 자격자 배치'],
      보호구:['절연장갑 착용 (등급 확인)','절연화 착용','절연 안전모 착용','보안면 착용']
    },
    화재폭발: {
      kw:['화재','화기','용접','불꽃','인화','폭발','가연성','점화','불티','산소절단','LPG','아세틸렌'],
      본질적:['화기작업 최소화 (볼트·체결 공법 전환)','불연성 자재 사용','인화성 물질 격리 보관'],
      공학적:['불꽃 비산방지 커버 설치','소화기 비치 (반경 5m 이내)','역화방지기 설치','방화격벽 설치'],
      행정적:['화기작업 허가제 운영','화재감시자 배치','가연물 사전 제거','화기 작업 후 30분 잔불 확인'],
      보호구:['방염복 착용','용접용 보안면 착용','용접장갑 착용','방진마스크(흄) 착용']
    },
    화학물질: {
      kw:['화학','유해물질','독성','용제','산','알칼리','도장','페인트','가스','흄','증기','MSDS'],
      본질적:['저독성·무독성 물질로 대체','밀폐 공정으로 전환','위험물 사용량 최소화'],
      공학적:['국소배기장치 설치','밀폐 설비 설치','자동 계량·투입 시스템 도입','MSDS 작업장 비치'],
      행정적:['취급 근로자 특수건강검진 실시','화학물질 취급 교육 실시','비상 대응 절차 수립'],
      보호구:['방독마스크 착용 (정화통 종류 확인)','내화학 장갑 착용','보호안경 착용','보호복 착용']
    },
    질식: {
      kw:['질식','밀폐','산소결핍','유해가스','CO','황화수소','하수도','탱크','맨홀','핏트','지하'],
      본질적:['밀폐공간 작업 최소화','원격 작업 방식 적용'],
      공학적:['강제 환기장치 가동','산소·가스 농도 측정기 설치','비상구조장비 비치 (구명줄·구조대)'],
      행정적:['밀폐공간 작업허가제 운영','작업 전·중 산소·유해가스 농도 측정','2인 1조 + 외부 감시인 배치'],
      보호구:['공기공급식 호흡보호구 착용','구명줄·전신 안전대 착용','통신장비 휴대']
    },
    중량물: {
      kw:['중량물','무거운','인력운반','허리','근골격','들기','크레인','호이스트','와이어','슬링','인양'],
      본질적:['중량물 경량화 설계','기계화 운반 시스템 도입','조립 단위 소형화'],
      공학적:['크레인·호이스트 설치','컨베이어·전동카 사용','진공흡착기·자석 리프터 활용'],
      행정적:['인력운반 중량 제한 준수 (남 25kg·여 15kg)','인양 작업 신호수 배치','와이어로프·슬링벨트 사전 점검'],
      보호구:['안전화 착용 (발 압착 방지)','허리보호대 착용','안전장갑 착용']
    },
    소음진동: {
      kw:['소음','진동','타격','충격음','착암기','천공','파쇄','해머','컴프레서'],
      본질적:['저소음 설비로 교체','진동이 적은 공법 전환','야간 소음 작업 금지'],
      공학적:['방음벽·방음 커버 설치','방진 마운트 설치','소음원 격리'],
      행정적:['소음 근로자 청력검사 실시','소음 작업시간 제한 (85dB 기준)','소음지도 작성·관리'],
      보호구:['귀마개 착용 (NRR 25↑)','귀덮개 착용','방진장갑 착용 (진동 작업)']
    },
    전도미끄럼: {
      kw:['전도','미끄럼','넘어짐','바닥','통로','계단','경사','빙판','물기','요철'],
      본질적:['미끄럼 방지 바닥재 시공','통로 경사 완화 설계 (15° 이하)'],
      공학적:['미끄럼 방지 테이프 부착','배수로 설치 (물기 제거)','적정 조도 확보 (150lux↑)','손잡이·핸드레일 설치'],
      행정적:['통로 정리정돈 유지 (5S)','위험구역 표지판 설치','청소 후 "미끄럼 주의" 표지'],
      보호구:['안전화 착용 (미끄럼 방지 밑창)','안전조끼 착용']
    },
    절단: {
      kw:['절단','베임','날카로운','공구','칼날','그라인더','커터','톱'],
      본질적:['절단 공정 자동화','위험 공구 사용 최소화'],
      공학적:['공구 방호가드 설치','칼날 보호 커버 사용','날 접촉 방지 장치 설치'],
      행정적:['작업 전 공구 상태 점검','절단 공구 사용 교육 실시'],
      보호구:['방검장갑 착용','보안경 착용','안전앞치마 착용']
    },
    붕괴: {
      kw:['붕괴','무너짐','지반침하','토사','흙막이','굴착','비탈면','사면','가시설'],
      본질적:['굴착 깊이 최소화','지반 개량 공법 적용'],
      공학적:['흙막이 지보공 설치','배수·차수 시스템 설치','계측 관리 시스템 구축'],
      행정적:['굴착 작업 계획서 수립 및 전문가 검토','기상 악화 시 즉시 작업 중단'],
      보호구:['안전모 착용','안전화 착용','형광 안전조끼 착용']
    }
  },

  init() {
    this.form           = document.getElementById('risk-form');
    this.itemsContainer = document.getElementById('risk-items');
    this.addItem();
    document.getElementById('btn-add-risk').addEventListener('click', () => this.addItem());
    this.form.addEventListener('submit', e => { e.preventDefault(); this.save(); });
    this._initDateFields();
  },

  // ── 날짜 필드 초기화 ─────────────────────────────────────
  _initDateFields() {
    const today = new Date().toISOString().split('T')[0];
    // 개선완료일은 평가일자 입력 전까지 비활성화
    const completeInput = document.getElementById('risk-complete-date');
    if (completeInput) completeInput.disabled = true;
  },

  // ── 평가일자 변경 → 개선예정일 min 갱신 ──────────────────
  onAssessDateChange() {
    const assessVal = document.getElementById('risk-date').value;
    const planInput = document.getElementById('risk-plan-date');
    const hint      = document.getElementById('risk-plan-hint');
    if (!planInput) return;

    if (assessVal) {
      planInput.min = assessVal;
      // 기존 개선예정일이 평가일자보다 이전이면 초기화
      if (planInput.value && planInput.value < assessVal) {
        planInput.value = '';
        this._setHint('risk-complete-hint', '');
        this._setHint('risk-plan-hint', '⚠️ 평가일자가 변경되어 초기화됩니다', 'warn');
        const completeInput = document.getElementById('risk-complete-date');
        if (completeInput) { completeInput.value = ''; completeInput.disabled = true; }
      } else {
        this._setHint('risk-plan-hint', '');
      }
      this._updateDday();
    }
  },

  // ── 개선예정일 변경 검증 ──────────────────────────────────
  onPlanDateChange() {
    const assessVal  = document.getElementById('risk-date').value;
    const planVal    = document.getElementById('risk-plan-date').value;
    const completeInput = document.getElementById('risk-complete-date');

    if (!planVal) {
      this._setHint('risk-plan-hint', '');
      if (completeInput) { completeInput.value = ''; completeInput.disabled = true; }
      return;
    }

    // 검증 1: 개선예정일 >= 평가일자
    if (assessVal && planVal < assessVal) {
      document.getElementById('risk-plan-date').value = assessVal;
      this._setHint('risk-plan-hint', '⚠️ 평가일자 이전으로 설정할 수 없습니다', 'warn');
      setTimeout(() => this._setHint('risk-plan-hint', ''), 2500);
      return;
    }

    // 개선완료일 활성화 + min 설정
    if (completeInput) {
      completeInput.disabled = false;
      completeInput.min = planVal;
      // 기존 완료일이 예정일보다 이전이면 초기화
      if (completeInput.value && completeInput.value < planVal) {
        completeInput.value = '';
        this._setHint('risk-complete-hint', '⚠️ 개선예정일이 변경되어 완료일이 초기화됩니다', 'warn');
        setTimeout(() => this._setHint('risk-complete-hint', ''), 2500);
      }
    }

    this._updateDday();
  },

  // ── 개선완료일 변경 검증 ──────────────────────────────────
  onCompleteDateChange() {
    const planVal     = document.getElementById('risk-plan-date').value;
    const completeVal = document.getElementById('risk-complete-date').value;

    if (!completeVal) { this._setHint('risk-complete-hint', ''); return; }

    // 검증: 완료일 >= 예정일
    if (planVal && completeVal < planVal) {
      document.getElementById('risk-complete-date').value = planVal;
      this._setHint('risk-complete-hint', '⚠️ 개선예정일 이전으로 설정할 수 없습니다', 'warn');
      setTimeout(() => this._setHint('risk-complete-hint', ''), 2500);
      return;
    }

    // 완료 여부 피드백
    const today = new Date().toISOString().split('T')[0];
    if (completeVal <= today) {
      this._setHint('risk-complete-hint', '✅ 개선 완료 처리됩니다', 'ok');
    } else {
      this._setHint('risk-complete-hint', '📅 미래 날짜 — 완료 예정으로 저장됩니다', 'info');
    }
  },

  // ── D-Day 힌트 표시 ──────────────────────────────────────
  _updateDday() {
    const planVal = document.getElementById('risk-plan-date').value;
    if (!planVal) return;
    const today   = new Date(); today.setHours(0,0,0,0);
    const planD   = new Date(planVal);
    const diff    = Math.round((planD - today) / 86400000);
    let msg = '';
    if (diff === 0)      msg = '📌 오늘까지 개선 완료 필요!';
    else if (diff < 0)   msg = `⚠️ D+${Math.abs(diff)} — 개선예정일 ${Math.abs(diff)}일 초과`;
    else if (diff <= 3)  msg = `🔔 D-${diff} — 곧 개선예정일입니다`;
    else                 msg = `📅 D-${diff}`;
    const cls = diff < 0 ? 'warn' : diff <= 3 ? 'alert' : 'info';
    this._setHint('risk-plan-hint', msg, cls);
  },

  // ── 힌트 렌더 헬퍼 ──────────────────────────────────────
  _setHint(id, msg, type = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'date-hint' + (type ? ' date-hint-' + type : '');
  },

  // ── 재해유형 → hazardDB 키 매핑 ─────────────────────────
  _DISASTER_HAZARD_MAP: {
    끼임:       '협착',
    떨어짐:     '추락',
    부딪힘:     '낙하',
    물체에맞음: '낙하',
    화재폭발:   '화재폭발',
    전도:       '전도미끄럼',
    감전:       '전기',
    근골격계질환: '중량물',
    기타:       null
  },

  // 재해유형 체크 변경 시 → AI 분석 트리거
  onDisasterTypeChange(n) {
    const item = document.getElementById(`risk-item-${n}`);
    if (!item) return;
    const checked = [...item.querySelectorAll('.risk-disaster-cb:checked')].map(cb => cb.value);
    if (!checked.length) {
      const hazardVal = item.querySelector('[data-field="hazard"]').value;
      this.analyzeHazard(n, hazardVal);
      return;
    }
    // 선택된 재해유형의 키워드 첫 번째를 조합해 AI 분석
    const keywords = checked
      .map(type => {
        const dbKey = this._DISASTER_HAZARD_MAP[type];
        return dbKey && this.hazardDB[dbKey] ? this.hazardDB[dbKey].kw[0] : type;
      })
      .join(' ');
    this._analyze(n, keywords);
  },

  addItem() {
    this.itemCount++;
    const n   = this.itemCount;
    const div = document.createElement('div');
    div.className = 'risk-item';
    div.id = `risk-item-${n}`;
    div.innerHTML = `
      <div class="risk-item-header">
        <span class="risk-item-number">위험요인 #${n}</span>
        ${n > 1 ? `<button type="button" class="btn-remove" onclick="Risk.removeItem(${n})">&times;</button>` : ''}
      </div>

      <!-- 재해유형 선택 -->
      <div class="risk-disaster-section">
        <div class="risk-disaster-label">⚠️ 재해유형</div>
        <div class="disaster-type-grid risk-disaster-grid">
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="끼임"       onchange="Risk.onDisasterTypeChange(${n})"><span>⚙️ 끼임</span></label>
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="떨어짐"     onchange="Risk.onDisasterTypeChange(${n})"><span>⬇️ 떨어짐(추락)</span></label>
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="부딪힘"     onchange="Risk.onDisasterTypeChange(${n})"><span>💥 부딪힘</span></label>
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="물체에맞음" onchange="Risk.onDisasterTypeChange(${n})"><span>🪨 물체에맞음</span></label>
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="화재폭발"   onchange="Risk.onDisasterTypeChange(${n})"><span>🔥 화재폭발</span></label>
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="전도"       onchange="Risk.onDisasterTypeChange(${n})"><span>🚶 전도</span></label>
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="감전"       onchange="Risk.onDisasterTypeChange(${n})"><span>⚡ 감전</span></label>
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="근골격계질환" onchange="Risk.onDisasterTypeChange(${n})"><span>🦴 근골격계</span></label>
          <label class="disaster-type-item"><input type="checkbox" class="risk-disaster-cb" value="기타"       onchange="Risk.onDisasterTypeChange(${n})"><span>⚠️ 기타</span></label>
        </div>
      </div>

      <input type="text"
             placeholder="위험요인을 직접 입력하거나 재해유형을 선택하세요"
             data-field="hazard"
             oninput="Risk.analyzeHazard(${n}, this.value)"
             required>

      <!-- ▶ 개선 전 위험도 평가 -->
      <div class="assess-section assess-before">
        <div class="assess-section-label">📋 개선 전 위험도</div>
        <div class="slh-row">
          <div class="slh-group">
            <div class="slh-label">가능성</div>
            <div class="slh-btns" id="slh-prob-${n}">
              <button type="button" class="slh-btn slh-low-btn"
                      onclick="Risk.setSlh(${n},'prob','하',this)">하</button>
              <button type="button" class="slh-btn slh-med-btn slh-active-med"
                      onclick="Risk.setSlh(${n},'prob','중',this)">중</button>
              <button type="button" class="slh-btn slh-high-btn"
                      onclick="Risk.setSlh(${n},'prob','상',this)">상</button>
            </div>
            <input type="hidden" id="prob-${n}" value="중">
          </div>
          <div class="slh-sep">×</div>
          <div class="slh-group">
            <div class="slh-label">심각도</div>
            <div class="slh-btns" id="slh-sev-${n}">
              <button type="button" class="slh-btn slh-low-btn"
                      onclick="Risk.setSlh(${n},'sev','하',this)">하</button>
              <button type="button" class="slh-btn slh-med-btn slh-active-med"
                      onclick="Risk.setSlh(${n},'sev','중',this)">중</button>
              <button type="button" class="slh-btn slh-high-btn"
                      onclick="Risk.setSlh(${n},'sev','상',this)">상</button>
            </div>
            <input type="hidden" id="sev-${n}" value="중">
          </div>
          <div class="slh-sep">=</div>
          <div class="slh-group">
            <div class="slh-label">위험도</div>
            <div class="slh-result rl-med" id="slh-result-${n}">중<br><small>개선 필요</small></div>
          </div>
        </div>
      </div>

      <!-- AI 위험통제계층 — 인라인 미리보기 -->
      <div id="ai-box-${n}" class="ai-box hidden">
        <div class="ai-box-header">
          🤖 AI 안전대책 제안 <span class="ai-badge-tag">위험통제계층</span>
          <button type="button" class="btn-ai-modal-open" onclick="Risk.openModal(${n})">
            📋 선택하여 적용
          </button>
        </div>
        <div id="ai-content-${n}"></div>
      </div>

      <!-- 안전대책 입력 -->
      <div class="countermeasure-row">
        <span class="countermeasure-label">안전대책 / 개선조치</span>
        <button type="button" class="btn-ai-suggest" onclick="Risk.openModal(${n})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          AI 추천
        </button>
      </div>
      <textarea placeholder="안전대책 / 개선조치를 기재하세요 (AI 추천 버튼으로 자동 생성 가능)"
                data-field="countermeasure" rows="3"></textarea>

      <!-- ▶ 개선 후 위험도 평가 -->
      <div class="assess-section assess-after">
        <div class="assess-section-label">
          ✅ 개선 후 위험도
          <span class="assess-after-note">심각도 고정 · 가능성만 재평가</span>
        </div>
        <div class="slh-row">
          <div class="slh-group">
            <div class="slh-label">가능성<span class="slh-label-sub"> (개선후)</span></div>
            <div class="slh-btns" id="slh-after-prob-${n}">
              <button type="button" class="slh-btn slh-low-btn slh-active-low"
                      onclick="Risk.setAfterSlh(${n},'하',this)">하</button>
              <button type="button" class="slh-btn slh-med-btn"
                      onclick="Risk.setAfterSlh(${n},'중',this)">중</button>
              <button type="button" class="slh-btn slh-high-btn"
                      onclick="Risk.setAfterSlh(${n},'상',this)">상</button>
            </div>
            <input type="hidden" id="after-prob-${n}" value="하">
          </div>
          <div class="slh-sep">×</div>
          <div class="slh-group">
            <div class="slh-label">심각도<span class="slh-label-sub"> (고정)</span></div>
            <div class="slh-fixed-sev" id="after-sev-display-${n}">중</div>
          </div>
          <div class="slh-sep">=</div>
          <div class="slh-group">
            <div class="slh-label">개선 후<br>위험도</div>
            <div class="slh-result rl-low" id="after-result-${n}">하<br><small>허용 가능</small></div>
          </div>
        </div>
      </div>

      <!-- ▶ 개선 전/후 사진 첨부 -->
      <div class="risk-photo-pair">
        <div class="risk-photo-section">
          <div class="risk-photo-label">📷 개선 전 사진</div>
          <input type="file" id="risk-photo-before-${n}" accept="image/*" multiple style="display:none"
                 onchange="Risk.handleRiskPhoto(${n},'before',this)">
          <div class="risk-photo-upload" onclick="document.getElementById('risk-photo-before-${n}').click()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>사진 추가</span>
          </div>
          <div id="risk-preview-before-${n}" class="risk-photo-preview-grid"></div>
        </div>
        <div class="risk-photo-section risk-photo-section-after">
          <div class="risk-photo-label risk-photo-label-after">✅ 개선 후 사진</div>
          <input type="file" id="risk-photo-after-${n}" accept="image/*" multiple style="display:none"
                 onchange="Risk.handleRiskPhoto(${n},'after',this)">
          <div class="risk-photo-upload risk-photo-upload-after" onclick="document.getElementById('risk-photo-after-${n}').click()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>사진 추가</span>
          </div>
          <div id="risk-preview-after-${n}" class="risk-photo-preview-grid"></div>
        </div>
      </div>`;

    this.itemsContainer.appendChild(div);
  },

  removeItem(n) {
    const el = document.getElementById(`risk-item-${n}`);
    if (el) el.remove();
    delete this._itemPhotos.before[n];
    delete this._itemPhotos.after[n];
  },

  // ── 개선 전/후 사진 처리 ──────────────────────────────────
  async handleRiskPhoto(n, type, input) {
    const files = Array.from(input.files);
    if (!files.length) return;
    if (!this._itemPhotos[type][n]) this._itemPhotos[type][n] = [];
    const arr = this._itemPhotos[type][n];
    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) { App.showToast(`${file.name}: 이미지 파일만 가능합니다`); continue; }
      if (file.size > 10 * 1024 * 1024)   { App.showToast(`${file.name}: 10MB 이하만 첨부 가능합니다`); continue; }
      if (arr.length >= 5) { App.showToast('사진은 최대 5장까지 첨부 가능합니다'); break; }
      try {
        const raw        = await this._fileToDataURL(file);
        const compressed = await this._compressImage(raw, 1200, 0.75);
        arr.push({ name: file.name, data: compressed });
        added++;
      } catch { App.showToast(`${file.name} 처리 실패`); }
    }
    input.value = '';
    if (added) this._renderRiskPhotoPreview(n, type);
  },

  _renderRiskPhotoPreview(n, type) {
    const container = document.getElementById(`risk-preview-${type}-${n}`);
    if (!container) return;
    const arr = (this._itemPhotos[type][n] || []);
    container.innerHTML = arr.map((p, i) => `
      <div class="risk-photo-thumb">
        <img src="${p.data}" alt="${App.escapeHtml(p.name)}"
             data-item="${n}" data-type="${type}" data-idx="${i}" style="cursor:zoom-in">
        <button type="button" class="risk-photo-remove"
                onclick="event.stopPropagation();Risk.removeRiskPhoto(${n},'${type}',${i})">&times;</button>
      </div>`).join('');
    container.querySelectorAll('img[data-idx]').forEach(img => {
      img.addEventListener('click', () => {
        const photos = this._itemPhotos[img.dataset.type][img.dataset.item] || [];
        const photo  = photos[+img.dataset.idx];
        if (photo) App._viewPhoto(photo.data);
      });
    });
  },

  removeRiskPhoto(n, type, idx) {
    (this._itemPhotos[type][n] || []).splice(idx, 1);
    this._renderRiskPhotoPreview(n, type);
  },

  _fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = ev => resolve(ev.target.result);
      r.onerror = ()  => reject(new Error('읽기 실패'));
      r.readAsDataURL(file);
    });
  },

  _compressImage(dataUrl, maxSize, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) { height = Math.round(height * maxSize / width); width = maxSize; }
          else                 { width  = Math.round(width  * maxSize / height); height = maxSize; }
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  // ── 개선 전 상중하 선택 ────────────────────────────────────
  setSlh(n, type, val, btn) {
    document.getElementById(`slh-${type}-${n}`)
      .querySelectorAll('.slh-btn')
      .forEach(b => b.classList.remove('slh-active-high','slh-active-med','slh-active-low'));
    btn.classList.add(val==='상'?'slh-active-high':val==='중'?'slh-active-med':'slh-active-low');
    document.getElementById(`${type}-${n}`).value = val;
    this.updateResult(n);

    // 심각도 변경 시 → 개선 후 심각도 표시 동기화 + 개선 후 위험도 갱신
    if (type === 'sev') {
      const display = document.getElementById(`after-sev-display-${n}`);
      if (display) {
        display.textContent = val;
        display.className = 'slh-fixed-sev slh-fixed-sev-' + (val==='상'?'high':val==='중'?'med':'low');
      }
      this.updateAfterResult(n);
    }
  },

  updateResult(n) {
    const prob = document.getElementById(`prob-${n}`)?.value || '중';
    const sev  = document.getElementById(`sev-${n}`)?.value  || '중';
    const r    = this.matrix[`${prob}_${sev}`] || { level:'중', desc:'개선 필요', cls:'rl-med' };
    const el   = document.getElementById(`slh-result-${n}`);
    if (!el) return;
    el.innerHTML = `${r.level}<br><small>${r.desc}</small>`;
    el.className = `slh-result ${r.cls}`;
  },

  // ── 개선 후 가능성 선택 ───────────────────────────────────
  setAfterSlh(n, val, btn) {
    document.getElementById(`slh-after-prob-${n}`)
      .querySelectorAll('.slh-btn')
      .forEach(b => b.classList.remove('slh-active-high','slh-active-med','slh-active-low'));
    btn.classList.add(val==='상'?'slh-active-high':val==='중'?'slh-active-med':'slh-active-low');
    document.getElementById(`after-prob-${n}`).value = val;
    this.updateAfterResult(n);
  },

  // ── 개선 후 위험도 계산 (심각도 고정) ─────────────────────
  updateAfterResult(n) {
    const afterProb = document.getElementById(`after-prob-${n}`)?.value || '하';
    const sev       = document.getElementById(`sev-${n}`)?.value        || '중'; // 개선 전 심각도 고정
    const r         = this.matrix[`${afterProb}_${sev}`] || { level:'하', desc:'허용 가능', cls:'rl-low' };
    const el        = document.getElementById(`after-result-${n}`);
    if (!el) return;
    el.innerHTML  = `${r.level}<br><small>${r.desc}</small>`;
    el.className  = `slh-result ${r.cls}`;

    // 개선 효과 화살표 표시
    this._renderImprovementArrow(n);
  },

  // ── 개선 전→후 효과 시각 표시 ──────────────────────────────
  _renderImprovementArrow(n) {
    const beforeEl = document.getElementById(`slh-result-${n}`);
    const afterEl  = document.getElementById(`after-result-${n}`);
    if (!beforeEl || !afterEl) return;

    const lvOrder = { '하': 0, '중': 1, '상': 2 };
    const beforeText = beforeEl.textContent.trim().charAt(0);
    const afterText  = afterEl.textContent.trim().charAt(0);
    const beforeLv   = lvOrder[beforeText] ?? 1;
    const afterLv    = lvOrder[afterText]  ?? 0;

    // assess-after 섹션에 개선 효과 클래스 반영
    const section = document.querySelector(`#risk-item-${n} .assess-after`);
    if (!section) return;
    section.classList.remove('improved', 'same', 'worsened');
    if (afterLv < beforeLv) section.classList.add('improved');
    else if (afterLv === beforeLv) section.classList.add('same');
    else section.classList.add('worsened');
  },

  // ── 디바운스 AI 분석 ──────────────────────────────────────
  _timers: {},
  analyzeHazard(n, text) {
    clearTimeout(this._timers[n]);
    if (!text || text.length < 2) {
      const b = document.getElementById(`ai-box-${n}`);
      if (b) b.classList.add('hidden');
      return;
    }
    this._timers[n] = setTimeout(() => this._analyze(n, text), 600);
  },

  _analyze(n, text) {
    const merged = { 본질적: new Set(), 공학적: new Set(), 행정적: new Set(), 보호구: new Set() };
    let hit = 0;

    for (const data of Object.values(this.hazardDB)) {
      if (data.kw.some(kw => text.includes(kw))) {
        hit++;
        ['본질적','공학적','행정적','보호구'].forEach(lv => data[lv].forEach(i => merged[lv].add(i)));
      }
    }
    if (!hit) {
      merged.본질적.add('위험 원천 제거 또는 안전한 공법으로 대체 검토');
      merged.공학적.add('방호장치·안전설비 설치 검토');
      merged.행정적.add('TBM 시 위험요인 공유');
      merged.행정적.add('작업 전 안전점검 실시');
      merged.보호구.add('작업 특성에 맞는 개인보호구 착용');
    }

    const cfg = {
      본질적:{ icon:'🚫', color:'#c62828', bg:'#ffebee', title:'본질적 안전화 — 제거·대체' },
      공학적:{ icon:'⚙️', color:'#1565c0', bg:'#e3f2fd', title:'공학적 대책 — 격리·방호' },
      행정적:{ icon:'📋', color:'#e65100', bg:'#fff3e0', title:'행정적 대책 — 절차·교육' },
      보호구:{ icon:'🦺', color:'#2e7d32', bg:'#e8f5e9', title:'보호구 착용 (PPE)' }
    };

    const html = ['본질적','공학적','행정적','보호구'].map(lv => {
      const items = [...merged[lv]].slice(0, 4);
      if (!items.length) return '';
      const c = cfg[lv];
      return `<div class="ai-level" style="border-left:3px solid ${c.color};background:${c.bg}">
        <div class="ai-level-title" style="color:${c.color}">${c.icon} ${c.title}</div>
        <ul class="ai-level-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>`;
    }).join('');

    const box     = document.getElementById(`ai-box-${n}`);
    const content = document.getElementById(`ai-content-${n}`);
    if (!box || !content) return;
    content.innerHTML = html;
    box.classList.remove('hidden');
  },

  async save() {
    const items = [];
    document.querySelectorAll('.risk-item').forEach(el => {
      const hazard      = el.querySelector('[data-field="hazard"]').value.trim();
      const prob        = el.querySelector('[id^="prob-"]')?.value      || '중';
      const sev         = el.querySelector('[id^="sev-"]')?.value       || '중';
      const afterProb   = el.querySelector('[id^="after-prob-"]')?.value || '하';
      const counter     = el.querySelector('[data-field="countermeasure"]').value.trim();
      const r           = this.matrix[`${prob}_${sev}`]          || { level:'중' };
      const rAfter      = this.matrix[`${afterProb}_${sev}`]     || { level:'하' };
      const disasterTypes = [...el.querySelectorAll('.risk-disaster-cb:checked')].map(cb => cb.value);
      const itemN         = el.id.replace('risk-item-', '');
      const beforePhotos  = (this._itemPhotos.before[itemN] || []).map(p => ({ name: p.name, data: p.data }));
      const afterPhotos   = (this._itemPhotos.after[itemN]  || []).map(p => ({ name: p.name, data: p.data }));
      if (hazard) items.push({
        hazard,
        disasterTypes,
        probability:      prob,
        severity:         sev,
        riskLevel:        r.level,
        countermeasure:   counter,
        afterProbability: afterProb,
        afterRiskLevel:   rAfter.level,
        beforePhotos,
        afterPhotos
      });
    });

    if (!items.length) { App.showToast('위험요인을 1개 이상 입력하세요'); return; }

    const planDate     = document.getElementById('risk-plan-date').value;
    const completeDate = document.getElementById('risk-complete-date').value;
    const today        = new Date().toISOString().split('T')[0];
    const assessDate   = document.getElementById('risk-date').value;

    // 날짜 유효성 재검증
    if (planDate && planDate < assessDate) {
      App.showToast('⚠️ 개선예정일은 평가일자 이후여야 합니다'); return;
    }
    if (completeDate && planDate && completeDate < planDate) {
      App.showToast('⚠️ 개선완료일은 개선예정일 이후여야 합니다'); return;
    }

    // 개선 상태 자동 판단
    let improveStatus = '미설정';
    if (completeDate) {
      improveStatus = completeDate <= today ? '완료' : '완료예정';
    } else if (planDate) {
      improveStatus = planDate < today ? '지연' : '진행중';
    }

    // 고위험 항목 수 계산
    const highCount = items.filter(i => i.riskLevel === '상').length;
    const highTxt   = highCount ? `<br>⚠️ 즉시개선 항목 <b>${highCount}건</b> 포함` : '';
    const planTxt   = planDate ? `<br>📅 개선예정일: ${planDate}` : '';

    const workName = document.getElementById('risk-work-name').value.trim();
    const ok = await App.confirm(
      `<b>${workName || '작업명 미입력'}</b> · 위험요인 ${items.length}건${highTxt}${planTxt}`,
      { type: 'save', title: '위험성 평가를 저장하시겠습니까?', icon: '⚠️' }
    );
    if (!ok) return;

    const data = {
      date:          assessDate,
      planDate:      planDate   || null,
      completeDate:  completeDate || null,
      improveStatus,
      workName:      workName,
      location:      document.getElementById('risk-location').value.trim(),
      items,
      assessor:      document.getElementById('risk-assessor').value.trim(),
      method:        '상중하',
      createdAt:     new Date().toISOString()
    };

    try {
      await collections.risk.add(data);
      App.showToast('✅ 위험성 평가가 저장되었습니다');
      this.resetForm();
      App.updateDashboard();
    } catch (err) {
      App.showToast('저장 오류: ' + err.message);
      console.error(err);
    }
  },

  resetForm() {
    this.form.reset();
    this.itemsContainer.innerHTML = '';
    this.itemCount = 0;
    this._itemPhotos = { before: {}, after: {} };
    this.addItem();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('risk-date').value = today;
    // 개선일 필드 초기화
    const planInput     = document.getElementById('risk-plan-date');
    const completeInput = document.getElementById('risk-complete-date');
    if (planInput)     { planInput.value = '';     planInput.min = today; }
    if (completeInput) { completeInput.value = ''; completeInput.disabled = true; }
    this._setHint('risk-plan-hint',     '');
    this._setHint('risk-complete-hint', '');
  },

  // ══════════════════════════════════════════════════════════
  //  AI 안전대책 추천 모달
  // ══════════════════════════════════════════════════════════
  _currentN: null,

  _TIER_MAP: {
    '본질적': { key:'본질적', label:'① 본질적 대책', cls:'prev-tier-1', icon:'🔴', desc:'제거·대체(최우선)' },
    '공학적': { key:'공학적', label:'② 공학적 대책', cls:'prev-tier-2', icon:'🟠', desc:'설비·환경 개선'    },
    '행정적': { key:'행정적', label:'③ 행정적 대책', cls:'prev-tier-3', icon:'🟢', desc:'절차·교육·관리'    },
    '보호구': { key:'보호구', label:'④ 보호구 착용', cls:'prev-tier-4', icon:'🔵', desc:'마지막 수단'       }
  },

  openModal(n) {
    const item = document.getElementById(`risk-item-${n}`);
    if (!item) return;
    const hazardVal = (item.querySelector('[data-field="hazard"]').value || '').trim();

    // 재해유형 체크박스에서 선택된 항목 수집
    const disasterChecked = [...item.querySelectorAll('.risk-disaster-cb:checked')].map(cb => cb.value);

    this._currentN = n;
    const container = document.getElementById('risk-suggest-categories');
    if (!container) return;

    const merged = { 본질적: new Set(), 공학적: new Set(), 행정적: new Set(), 보호구: new Set() };
    const hitNames = [];

    // 1순위: 선택된 재해유형으로 DB 조회
    disasterChecked.forEach(type => {
      const dbKey = this._DISASTER_HAZARD_MAP[type];
      if (dbKey && this.hazardDB[dbKey] && !hitNames.includes(dbKey)) {
        hitNames.push(dbKey);
        ['본질적','공학적','행정적','보호구'].forEach(lv => {
          (this.hazardDB[dbKey][lv] || []).forEach(i => merged[lv].add(i));
        });
      }
    });

    // 2순위: 위험요인 텍스트 키워드로 DB 조회
    for (const [name, data] of Object.entries(this.hazardDB)) {
      if (data.kw.some(kw => hazardVal.includes(kw)) && !hitNames.includes(name)) {
        hitNames.push(name);
        ['본질적','공학적','행정적','보호구'].forEach(lv => {
          (data[lv] || []).forEach(i => merged[lv].add(i));
        });
      }
    }

    if (!hitNames.length) {
      merged.본질적.add('위험 원천 제거 또는 안전한 공법·재료로 대체');
      merged.공학적.add('방호장치·안전설비 설치');
      merged.공학적.add('비상정지 장치 설치');
      merged.행정적.add('TBM 시 위험요인 공유 및 작업 전 안전점검');
      merged.행정적.add('작업절차서(SOP) 수립 및 교육');
      merged.보호구.add('작업 특성에 맞는 보호구 착용 의무화');
    }

    const tierKeys = ['본질적','공학적','행정적','보호구'];
    let html = '';

    if (hitNames.length) {
      const labelMap = { 추락:'추락·떨어짐', 낙하:'낙하·비래', 협착:'협착·끼임', 전기:'감전', 화재폭발:'화재·폭발', 화학물질:'화학물질', 질식:'질식·밀폐공간', 중량물:'중량물·인양', 소음진동:'소음·진동', 전도미끄럼:'전도·미끄러짐', 절단:'절단·베임', 붕괴:'붕괴·토사' };
      const labels = hitNames.map(k => `<strong>${labelMap[k] || k}</strong>`).join(', ');
      const source = disasterChecked.length ? '🎯 재해유형 선택 기반' : '🔍 위험요인 키워드 감지';
      html += `<div style="font-size:11px;color:var(--primary);font-weight:700;padding:4px 2px 8px">${source}: ${labels}</div>`;
    }

    tierKeys.forEach((key, idx) => {
      const items = [...merged[key]];
      if (!items.length) return;
      const t = this._TIER_MAP[key];
      html += `<div class="prev-tier ${t.cls}">
        <div class="prev-tier-header">
          ${t.icon} ${t.label}
          <span class="prev-tier-badge">${t.desc}</span>
        </div>
        <div class="prev-items">`;
      items.forEach((item, i) => {
        const cbId = `risk_prev_${idx}_${i}`;
        html += `<label class="prev-item" for="${cbId}">
          <input type="checkbox" id="${cbId}" value="${App.escapeHtml(item)}"
                 onchange="this.closest('.prev-item').classList.toggle('checked', this.checked)">
          <span class="prev-item-text">${App.escapeHtml(item)}</span>
        </label>`;
      });
      html += `</div></div>`;
    });

    html += `<div class="prev-source">📚 출처: 산업안전보건기준에 관한 규칙(2026) · KOSHA GUIDE · 사업장 위험성평가 지침(제2024-76호)</div>`;

    container.innerHTML = html;
    document.getElementById('risk-suggest-modal').classList.remove('hidden');
  },

  applyMeasures() {
    const n = this._currentN;
    if (!n) return;
    const checked = document.querySelectorAll('#risk-suggest-categories input[type="checkbox"]:checked');
    if (!checked.length) { App.showToast('항목을 하나 이상 선택하세요'); return; }

    const tierLabels = ['① 본질적 대책','② 공학적 대책','③ 행정적 대책','④ 보호구 착용'];
    const byTier = {};
    tierLabels.forEach(t => { byTier[t] = []; });

    checked.forEach(cb => {
      const label  = cb.closest('.prev-item');
      const header = label.closest('.prev-tier').querySelector('.prev-tier-header');
      const tier   = tierLabels.find(t => header.textContent.includes(t)) || '';
      if (tier) byTier[tier].push(cb.value);
    });

    const lines = [];
    tierLabels.forEach(tier => {
      if (byTier[tier].length) {
        lines.push(`[${tier}]`);
        byTier[tier].forEach(item => lines.push(`• ${item}`));
      }
    });

    const ta = document.querySelector(`#risk-item-${n} [data-field="countermeasure"]`);
    if (!ta) return;
    const existing = ta.value.trim();
    ta.value = existing ? existing + '\n\n' + lines.join('\n') : lines.join('\n');

    this.closeModal();
    App.showToast(`✓ ${checked.length}개 안전대책 적용 완료`);
  },

  closeModal(event) {
    if (event) {
      const overlay = document.getElementById('risk-suggest-modal');
      if (event.target !== overlay) return;
    }
    document.getElementById('risk-suggest-modal').classList.add('hidden');
  }
};
