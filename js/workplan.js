// ===== Work Plan Module (작업계획서) =====
const WorkPlan = {
  supervisorSig: null,
  photos: [],        // { name, data }[]
  crew:   [],        // { name, role }[]

  init() {
    this.form = document.getElementById('workplan-form');

    // 멀티 사진 업로드
    const photoInput = document.getElementById('wp-photo-input');
    if (photoInput) photoInput.addEventListener('change', e => this.handlePhotos(e));
    const uploadArea = document.getElementById('wp-upload-area');
    if (uploadArea) uploadArea.addEventListener('click', () => photoInput && photoInput.click());

    // 작업기간 날짜 선택기 이벤트
    const ps = document.getElementById('wp-period-start');
    const pe = document.getElementById('wp-period-end');
    if (ps) ps.addEventListener('change', () => this._updatePeriod());
    if (pe) pe.addEventListener('change', () => this._updatePeriod());

    // 투입인원 — Enter 키로 추가
    const crewName = document.getElementById('wp-crew-name');
    const crewRole = document.getElementById('wp-crew-role');
    if (crewName) crewName.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); this.addCrew(); } });
    if (crewRole) crewRole.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); this.addCrew(); } });

    // 폼 제출
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.save(); });
  },

  // ── 작업기간 날짜 선택기 ──────────────────────────────────
  _updatePeriod() {
    const startEl   = document.getElementById('wp-period-start');
    const endEl     = document.getElementById('wp-period-end');
    const hiddenEl  = document.getElementById('wp-period');
    const summaryEl = document.getElementById('wp-period-summary');
    const start = startEl?.value;
    const end   = endEl?.value;

    // 종료일이 시작일보다 앞이면 시작일로 맞춤
    if (start && end && end < start) {
      endEl.value = start;
    }

    const s = startEl?.value;
    const e = endEl?.value;

    if (s && e) {
      const fmt  = d => d.replace(/-/g, '.');
      const diff = Math.round((new Date(e) - new Date(s)) / 86400000) + 1;
      const periodStr = `${fmt(s)} ~ ${fmt(e)}`;
      if (hiddenEl) hiddenEl.value = periodStr;

      if (summaryEl) {
        summaryEl.classList.remove('hidden');
        summaryEl.innerHTML =
          `<span class="wp-period-sum-icon">📅</span>` +
          `<span class="wp-period-sum-text">${periodStr}</span>` +
          `<span class="wp-period-sum-days">${diff}일간</span>`;
      }

      // 단축버튼 활성화 표시 제거
      document.querySelectorAll('.wp-period-btn').forEach(b => b.classList.remove('active'));
      const shortcuts = { 1:'.wp-period-btn:nth-child(1)', 3:'.wp-period-btn:nth-child(2)',
                          7:'.wp-period-btn:nth-child(3)', 14:'.wp-period-btn:nth-child(4)',
                          30:'.wp-period-btn:nth-child(5)' };
      if (shortcuts[diff]) {
        document.querySelector(`.wp-period-shortcuts ${shortcuts[diff]}`)?.classList.add('active');
      }
    } else {
      if (hiddenEl)  hiddenEl.value = '';
      if (summaryEl) summaryEl.classList.add('hidden');
    }
  },

  // 단축버튼: 시작일로부터 N일 후를 종료일로 설정
  setPeriodDays(days) {
    const startEl = document.getElementById('wp-period-start');
    const endEl   = document.getElementById('wp-period-end');
    const dateEl  = document.getElementById('wp-date');
    if (!startEl || !endEl) return;

    // 시작일이 없으면 작성일자 or 오늘로 세팅
    if (!startEl.value) {
      startEl.value = dateEl?.value || new Date().toISOString().split('T')[0];
    }

    const start = new Date(startEl.value);
    const end   = new Date(start);
    end.setDate(end.getDate() + days - 1);
    endEl.value = end.toISOString().split('T')[0];
    this._updatePeriod();

    // 버튼 활성화
    document.querySelectorAll('.wp-period-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
  },

  // ── 투입인원 추가 ──────────────────────────────────────────
  addCrew() {
    const nameEl = document.getElementById('wp-crew-name');
    const roleEl = document.getElementById('wp-crew-role');
    const name = nameEl.value.trim();
    const role = roleEl.value.trim();
    if (!name) { App.showToast('성명을 입력하세요'); nameEl.focus(); return; }
    if (this.crew.some(c => c.name === name)) {
      App.showToast('이미 추가된 인원입니다'); nameEl.focus(); return;
    }
    this.crew.push({ name, role });
    this._syncWorkerCount();
    this._renderCrew();
    nameEl.value = '';
    roleEl.value = '';
    nameEl.focus();
  },

  removeCrew(idx) {
    this.crew.splice(idx, 1);
    this._syncWorkerCount();
    this._renderCrew();
  },

  // 총 인원 수 필드 자동 동기화
  _syncWorkerCount() {
    const countEl = document.getElementById('wp-workers');
    if (countEl && this.crew.length > 0) countEl.value = this.crew.length;
    const badge = document.getElementById('wp-crew-count');
    if (badge) badge.textContent = `${this.crew.length}명`;
  },

  _renderCrew() {
    const list = document.getElementById('wp-crew-list');
    if (!list) return;
    if (!this.crew.length) {
      list.innerHTML = '<p class="wp-crew-empty">아직 추가된 인원이 없습니다</p>';
      return;
    }
    list.innerHTML = `
      <div class="wp-crew-table">
        <div class="wp-crew-thead">
          <span>No.</span><span>성명</span><span>직종·역할</span><span></span>
        </div>
        ${this.crew.map((c, i) => `
          <div class="wp-crew-row">
            <span class="wp-crew-no">${i + 1}</span>
            <span class="wp-crew-name">${App.escapeHtml(c.name)}</span>
            <span class="wp-crew-role">${App.escapeHtml(c.role) || '<span style="color:var(--gray-400)">—</span>'}</span>
            <button type="button" class="wp-crew-del" onclick="WorkPlan.removeCrew(${i})">×</button>
          </div>`).join('')}
      </div>`;
  },

  onPageShow() {
    if (!this.supervisorSig) {
      this.supervisorSig = new SignatureCanvas(
        document.getElementById('wp-sig-canvas'),
        document.getElementById('wp-sig-clear')
      );
    }
    this.supervisorSig.resize();
  },

  // ── 멀티 사진 처리 (TBM/사고보고서와 동일 로직) ──────────
  async handlePhotos(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        App.showToast(`${file.name}: 이미지 파일만 가능합니다`); continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        App.showToast(`${file.name}: 10MB 이하만 첨부 가능합니다`); continue;
      }
      if (this.photos.length >= 10) {
        App.showToast('사진은 최대 10장까지 첨부 가능합니다'); break;
      }
      try {
        const raw        = await this._fileToDataURL(file);
        const compressed = await this._compressImage(raw, 1200, 0.78);
        this.photos.push({ name: file.name, data: compressed });
        added++;
      } catch {
        App.showToast(`${file.name} 처리 실패`);
      }
    }
    e.target.value = '';
    if (added) {
      this.renderPhotoPreview();
      App.showToast(`📷 사진 ${added}장 추가 (총 ${this.photos.length}장)`);
    }
  },

  removePhoto(idx) {
    this.photos.splice(idx, 1);
    this.renderPhotoPreview();
    App.showToast('사진이 삭제되었습니다');
  },

  renderPhotoPreview() {
    const grid = document.getElementById('wp-photo-preview');
    if (!grid) return;
    if (!this.photos.length) { grid.innerHTML = ''; return; }
    grid.innerHTML = this.photos.map((p, i) => `
      <div class="photo-thumb">
        <img src="${p.data}" alt="${App.escapeHtml(p.name)}"
             onclick="App._viewPhoto('${p.data}')">
        <button type="button" class="photo-remove"
                onclick="event.stopPropagation();WorkPlan.removePhoto(${i})"
                title="삭제">×</button>
      </div>`).join('');
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
        let { width: w, height: h } = img;
        if (w > maxSize || h > maxSize) {
          if (w >= h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else        { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  },

  async save() {
    const supervisor = document.getElementById('wp-supervisor').value.trim();
    if (!supervisor) { App.showToast('현장책임자를 입력하세요'); return; }

    const workName = document.getElementById('wp-work-name').value.trim();
    const date     = document.getElementById('wp-date').value;
    const workers  = document.getElementById('wp-workers').value;
    const sigTxt   = this.supervisorSig ? '<br>✍️ 책임자 서명 포함' : '';
    const photoTxt = this.photos.length ? `<br>📷 사진 ${this.photos.length}장 첨부` : '';
    const crewTxt  = this.crew.length   ? `<br>👷 투입인원 ${this.crew.length}명 등록` : '';
    const ok = await App.confirm(
      `<b>${workName || '작업명 미입력'}</b><br>${date} · 작업인원 ${workers || '-'}명${sigTxt}${photoTxt}${crewTxt}`,
      { type: 'save', title: '작업계획서를 저장하시겠습니까?', icon: '📝' }
    );
    if (!ok) return;

    const disasterTypes = [...document.querySelectorAll('input[name="wp-disaster"]:checked')]
                            .map(cb => cb.value);

    const data = {
      date,
      company:      document.getElementById('wp-company').value.trim(),
      workName,
      location:     document.getElementById('wp-location').value.trim(),
      period:       document.getElementById('wp-period').value.trim(),
      workers,
      supervisor,
      equipment:    document.getElementById('wp-equipment').value.trim(),
      content:      document.getElementById('wp-content').value.trim(),
      disasterTypes,
      hazards:      document.getElementById('wp-hazards').value.trim(),
      measures:     document.getElementById('wp-measures').value.trim(),
      photos:       this.photos.map(p => p.data),
      crew:         this.crew,
      supervisorSignature: this.supervisorSig ? this.supervisorSig.toDataURL() : '',
      status:       'submitted',
      createdAt:    new Date().toISOString()
    };

    try {
      const docRef = await collections.workplan.add(data);

      // ── PTW 연동 알림 등록 ──────────────────────────────────
      const notice = {
        id:         docRef.id,
        workName:   data.workName,
        company:    data.company,
        location:   data.location,
        workers:    data.workers,
        supervisor: data.supervisor,
        date:       data.date,
        period:     data.period,
        content:    data.content,
        hazards:    data.hazards,
        measures:   data.measures,
        crew:       data.crew || [],
        savedAt:    data.createdAt
      };
      const pending = JSON.parse(localStorage.getItem('wp_ptw_pending') || '[]');
      pending.unshift(notice);                          // 최신 순
      localStorage.setItem('wp_ptw_pending', JSON.stringify(pending));
      App.updatePTWBadge();
      // ────────────────────────────────────────────────────────

      App.showToast('✅ 작업계획서 저장 완료 — 작업허가서 연동 알림이 등록됐습니다');
      this.resetForm();
      App.updateDashboard();
    } catch (err) {
      App.showToast('저장 오류: ' + err.message);
      console.error(err);
    }
  },

  resetForm() {
    this.form.reset();
    // 사진 초기화
    this.photos = [];
    const grid = document.getElementById('wp-photo-preview');
    if (grid) grid.innerHTML = '';
    document.getElementById('wp-photo-input').value = '';
    // 투입인원 초기화
    this.crew = [];
    this._renderCrew();
    const badge = document.getElementById('wp-crew-count');
    if (badge) badge.textContent = '0명';
    // 기간 선택기 초기화
    const ps = document.getElementById('wp-period-start');
    const pe = document.getElementById('wp-period-end');
    const sm = document.getElementById('wp-period-summary');
    if (ps) ps.value = '';
    if (pe) pe.value = '';
    if (sm) sm.classList.add('hidden');
    document.querySelectorAll('.wp-period-btn').forEach(b => b.classList.remove('active'));
    // 재해유형 체크박스 초기화
    document.querySelectorAll('input[name="wp-disaster"]').forEach(cb => { cb.checked = false; });
    // 서명·날짜 초기화
    if (this.supervisorSig) this.supervisorSig.clear();
    document.getElementById('wp-date').value = new Date().toISOString().split('T')[0];
  },

  // ══════════════════════════════════════════════════════════════
  //  AI 안전대책 추천 — 공종·작업명·위험요인 키워드 분석
  //  근거: 산업안전보건기준에 관한 규칙(고용노동부령 제450호, 2026.03.02)
  //        KOSHA GUIDE 각 분야별 기술지침
  //        2026 산업안전보건기준에 관한 규칙 만화해설판
  // ══════════════════════════════════════════════════════════════

  WP_WORK_DB: [
    /* ────────────── 1. 비계 / 고소작업 ────────────── */
    {
      id: 'scaffold',
      name: '비계·고소작업',
      keywords: ['비계','고소','발판','난간','추락','지붕','슬래브','외벽','창틀','외부','곤돌라','달비계','말비계','이동식','시스템비계','높이','층','고공'],
      tiers: {
        '① 본질적 대책': [
          '고소작업을 지상에서 선조립 후 일괄 설치하는 방식으로 전환 (규칙 §42)',
          '작업발판 폭 40cm 미만 구간은 작업 전 구조 변경',
          '고소작업대(작업차) 도입으로 비계 조립·해체 없이 작업'
        ],
        '② 공학적 대책': [
          '안전난간 설치: 상부 90~120cm, 중간대 45cm, 발끝막이판 10cm 이상 (규칙 §13)',
          '추락방호망(안전망) 설치 — 10m 이내마다 1단씩 (규칙 §42)',
          '비계 벽이음: 수직 5m, 수평 5.5m 이하마다 설치 (규칙 §60)',
          '작업발판 최대 적재하중 표시 및 구조검토서 작성',
          '개구부 덮개·울타리 설치, 잠금장치 부착 (규칙 §43)',
          '비계 하부 받침철물(잭베이스) 조정·고정 상태 확인'
        ],
        '③ 행정적 대책': [
          '작업허가서(PTW) 발행 — 고소작업 전 필수',
          '비계 조립·해체 작업지휘자 지정 (규칙 §58)',
          '관리감독자 지정 및 작업 전 점검 실시',
          '작업 전 TBM — 추락·낙하 위험요인 공유',
          '악천후(풍속 10m/s 이상, 강우·강설) 시 작업 중지 기준 수립 (규칙 §37)',
          '비계 조립·해체 특별안전교육 실시 (16시간 이상)'
        ],
        '④ 보호구 착용': [
          '안전대(전신하네스) 착용 및 안전대 부착설비(D링, 구명줄)에 체결',
          '안전모 착용 (턱끈 반드시 체결)',
          '안전화(미끄럼 방지 밑창) 착용',
          '안전장갑 착용'
        ]
      },
      source: '산안기준규칙 §42~§74, KOSHA GUIDE C-4·C-30'
    },

    /* ────────────── 2. 굴착 / 터파기 ────────────── */
    {
      id: 'excavation',
      name: '굴착·터파기',
      keywords: ['굴착','터파기','절토','성토','흙막이','굴삭','토사','사면','경사','땅','지반','기초','파일','항타','지하','매설','지하수','붕괴','토류'],
      tiers: {
        '① 본질적 대책': [
          '굴착 깊이 2m 미만 시 사면 굴착(1:0.5 기울기) 또는 단계 굴착으로 흙막이 대체 (규칙 §340)',
          '지하 매설물 사전 조사 및 이설 후 굴착',
          '굴착 면적·깊이 최소화 공법(트렌치리스 공법 등) 적용'
        ],
        '② 공학적 대책': [
          '굴착 깊이 1.5m 이상: 흙막이 지보공 설치 의무 (규칙 §342)',
          '흙막이 지보공 구조계산서 작성 및 시공 준수',
          '굴착 상단부 2m 이내 하중(자재·장비) 적치 금지',
          '굴착면 주변 배수시설 설치, 강우 시 우수 유입 차단',
          '지하수위 모니터링 — 수위 급변 시 즉시 작업 중지',
          '굴착면 상부 안전펜스·경고 테이프 설치'
        ],
        '③ 행정적 대책': [
          '굴착작업 시작 전 지반조사 보고서 검토',
          '매설물(가스·수도·전기·통신) 관리기관 확인 후 작업 (규칙 §338)',
          '굴착 작업지휘자 지정 및 감시인 배치',
          '강우 후 굴착면 점검·보강 후 재작업',
          '굴착 장비 후방·측면 접근 금지구역 설정 및 유도자 배치'
        ],
        '④ 보호구 착용': [
          '안전모 착용',
          '안전화 착용',
          '형광 안전조끼 착용 — 장비 운행 구역',
          '방진마스크 착용 — 분진 발생 시'
        ]
      },
      source: '산안기준규칙 §338~§395, KOSHA GUIDE C-12·C-20'
    },

    /* ────────────── 3. 용접 / 화기작업 ────────────── */
    {
      id: 'welding',
      name: '용접·화기작업',
      keywords: ['용접','절단','화기','불꽃','아크','가스','산소','아세틸렌','토치','그라인더','연마','불티','화재','폭발','인화','도장전','도막','유증기','용접흄','분진'],
      tiers: {
        '① 본질적 대책': [
          '가연성 물질 인접 작업 시 사전 제거 또는 작업 구역 이전',
          '도막·도료 등 인화성 물질 있는 구조물은 잔류물 완전 제거 후 작업',
          '가스 용접 대신 전기 용접 전환 (가스 폭발 위험 저감)'
        ],
        '② 공학적 대책': [
          '화기작업 반경 11m 이내 가연물 제거 또는 불연성 덮개·방화판 설치 (규칙 §241)',
          '방화 커튼·불꽃 비산 방지막 설치',
          '분말소화기(3.3kg 이상) 작업 위치 5m 이내 비치',
          '국소배기장치 설치 — 용접흄·가스 배출 (규칙 §232)',
          '가스 호스 연결부 비눗물 검사 및 역화방지기 설치',
          '용접기 접지 실시 및 감전방지용 자동전격방지기 부착'
        ],
        '③ 행정적 대책': [
          '화기작업 허가서(PTW) 발행 의무 — 작업 전 관리감독자 서명',
          '화기작업 전·중·후 가스농도 측정 (LEL 10% 이하 확인)',
          '화기감시자(火氣監視者) 지정 — 작업 중 상주, 종료 후 30분 잔류',
          '용접 특별안전교육 이수자만 작업 투입',
          '작업 후 불씨 잔류 여부 최종 확인 점검표 작성'
        ],
        '④ 보호구 착용': [
          '용접면(자동차광 헬멧) 착용 — 아크 광선 차단',
          '방염복(난연 소재 작업복) 착용',
          '방열장갑 착용',
          '용접흄용 방진마스크(2급 이상) 또는 방독마스크 착용',
          '가죽 안전화 착용'
        ]
      },
      source: '산안기준규칙 §225~§261, KOSHA GUIDE P-15·P-81'
    },

    /* ────────────── 4. 전기작업 ────────────── */
    {
      id: 'electrical',
      name: '전기작업',
      keywords: ['전기','배선','배전반','분전반','전선','케이블','감전','충전부','절연','접지','누전','변압기','개폐기','판넬','전압','전류','아크','단락','합선','인입선','가공선'],
      tiers: {
        '① 본질적 대책': [
          '활선(충전) 작업을 정전 작업으로 전환 — 감전 위험 원천 제거 (규칙 §319)',
          '저압 기기로 교체 (고압→저압 설비 변경)',
          '원격 조작·자동화로 작업자 충전부 접촉 제거'
        ],
        '② 공학적 대책': [
          '충전부 절연 덮개·방호 커버·방호 울 설치 (규칙 §301)',
          '누전차단기 설치 및 매월 1회 이상 작동시험 (규칙 §304)',
          '접지공사 실시 — 접지 저항값 10Ω 이하 유지 (규칙 §302)',
          '분전함·배전반 잠금 장치 설치',
          'LOTO(잠금·태그아웃) 장치 비치 — 정전 작업 시 의무 적용',
          '방폭형 전기설비 사용 — 가스·분진 발생 구역'
        ],
        '③ 행정적 대책': [
          '전기작업 자격자(전기기능사·산업기사 이상) 지정 작업 (규칙 §319)',
          'LOTO 절차서 수립 — 전원 차단→잠금→검전→단락접지→작업 순서 문서화',
          '정전 작업 작업허가서(PTW) 발행',
          '활선 작업 최소화 및 안전거리 확보 (규칙 §322)',
          '전기설비 정기점검 주기 수립 및 점검표 운용'
        ],
        '④ 보호구 착용': [
          '절연장갑(내전압 7,000V 이상) 착용',
          '절연안전모 착용',
          '절연화(내전압) 착용',
          '전기 아크 방호복 착용 — 고압·특고압 작업',
          '검전기 사용 — 작업 전 반드시 무전압 확인'
        ]
      },
      source: '산안기준규칙 §299~§330, KOSHA GUIDE E-2·E-13'
    },

    /* ────────────── 5. 크레인 / 양중 / 인양 ────────────── */
    {
      id: 'crane',
      name: '크레인·양중·인양',
      keywords: ['크레인','인양','양중','호이스트','리프트','달기','슬링','와이어','체인블록','고리','줄걸기','신호','인양물','낙하','비래','콘크리트펌프','타워크레인','카고크레인'],
      tiers: {
        '① 본질적 대책': [
          '인양 작업 하부를 통행금지 구역으로 설정, 작업자 접근 원천 차단 (규칙 §14)',
          '지상 선조립 후 일괄 인양으로 고소 작업시간 최소화',
          '경량화 설계로 인양 중량 저감'
        ],
        '② 공학적 대책': [
          '크레인 정격하중 초과 작업 절대 금지 — 과부하 방지장치 점검 (규칙 §132)',
          '줄걸기용 와이어로프: 안전계수 5 이상, 킹크·마모 즉시 교체 (규칙 §166)',
          '인양 반경 내 출입금지 펜스·로프 설치 및 경고 표지',
          '크레인 아웃리거 완전 전개 및 지반 보강 확인',
          '강풍(풍속 10m/s 이상) 시 자동 운행 정지 설정',
          '훅(Hook) 해지장치 설치·점검'
        ],
        '③ 행정적 대책': [
          '크레인 운전 자격자(면허 소지자) 탑승 운전 (규칙 §140)',
          '신호수(유도자) 지정 및 신호 방법 사전 교육',
          '인양 작업 전 안전점검 체크리스트 작성',
          '인양물 결박 상태 책임자 확인 후 작업 시작',
          '작업반경 내 관계자 외 출입금지 조치'
        ],
        '④ 보호구 착용': [
          '안전모 착용 (낙하물 방호)',
          '형광 안전조끼 착용 — 지상 신호수',
          '안전화 착용',
          '안전장갑 착용 — 와이어로프 취급 시'
        ]
      },
      source: '산안기준규칙 §132~§196, KOSHA GUIDE M-107·C-17'
    },

    /* ────────────── 6. 지게차 / 차량계 하역 ────────────── */
    {
      id: 'forklift',
      name: '지게차·하역운반',
      keywords: ['지게차','포크리프트','하역','운반','적재','화물차','덤프','로더','카트','핸드파레트','물류','창고','상하차','팔레트','대차','이동'],
      tiers: {
        '① 본질적 대책': [
          '보행자 통로와 지게차 통로를 물리적으로 분리 (규칙 §179)',
          '중량물 이동 경로를 수평·직선화하여 경사로 이동 최소화',
          '자동 컨베이어·AGV 도입으로 지게차 운행 횟수 감축'
        ],
        '② 공학적 대책': [
          '지게차 운행 경로 황색 바닥 표시선 도색 및 교차로 볼록거울 설치',
          '보행자 출입구에 에어커튼·스트립커튼 설치로 동선 분리',
          '지게차 후방경보장치·LED 작동등 설치 의무 (규칙 §179)',
          '통로 폭: 지게차 최대 폭 + 60cm 이상 확보',
          '포크 상승 시 마스트 경사각 유지, 급선회 금지 장치',
          '충전 구역 환기시설 설치 (배터리 수소가스 배출)'
        ],
        '③ 행정적 대책': [
          '지게차 운전 자격자(면허 소지자) 지정 운전 (규칙 §186)',
          '작업 전 일상점검표 작성 (브레이크·포크·경보장치 확인)',
          '운행 구역 내 보행자 출입금지 조치 및 안내표지 설치',
          '전조등·후방카메라 야간 작업 시 추가 점검',
          '적재 중량 정격하중 초과 금지 — 하중 표시판 부착'
        ],
        '④ 보호구 착용': [
          '안전모 착용 (낙하물 위험 구역)',
          '형광 안전조끼 착용 — 보행 작업자 전원',
          '안전화 착용'
        ]
      },
      source: '산안기준규칙 §179~§228, KOSHA GUIDE M-61·M-113'
    },

    /* ────────────── 7. 콘크리트 / 거푸집 / 동바리 ────────────── */
    {
      id: 'concrete',
      name: '콘크리트·거푸집·동바리',
      keywords: ['콘크리트','거푸집','동바리','형틀','슬래브','타설','펌프카','믹서','배근','철근','거더','보','붕괴','지지','공사'],
      tiers: {
        '① 본질적 대책': [
          'PC(프리캐스트) 공법 도입 — 현장 거푸집 조립 최소화',
          '시스템 동바리(수직재·수평재 일체형) 채택으로 조립 오류 저감',
          '콘크리트 타설 구역 하부 작업 금지 구역 설정'
        ],
        '② 공학적 대책': [
          '동바리 구조계산서 작성 — 허용 수직하중 이내로 설치 (규칙 §331)',
          '동바리 수직도 확인 (1/200 이내) 및 가새재 설치',
          '거푸집 동바리 받침판·깔목 설치 — 침하 방지',
          '콘크리트 타설 중 동바리 변위 감시자 배치',
          '개구부·슬래브 단부 안전난간·덮개 설치',
          '콘크리트 펌프카 아웃리거 지반 보강 후 전개'
        ],
        '③ 행정적 대책': [
          '거푸집 동바리 조립·해체 작업지휘자 지정 (규칙 §332)',
          '콘크리트 타설 전 거푸집 동바리 최종 점검 실시',
          '콘크리트 압축강도 확인(설계기준의 100% 이상) 후 동바리 해체',
          '타설 중 진동다짐 과도 사용 금지 절차 수립',
          '우천·강풍 시 타설 작업 중지 기준 수립'
        ],
        '④ 보호구 착용': [
          '안전모 착용',
          '안전화 착용',
          '방수 장갑 착용 — 콘크리트 직접 접촉 방지 (피부 화상)',
          '방진마스크 착용 — 시멘트 분진',
          '보안경 착용 — 콘크리트 비산 시'
        ]
      },
      source: '산안기준규칙 §321~§342, KOSHA GUIDE C-13·C-24'
    },

    /* ────────────── 8. 철골 / 구조물 조립·해체 ────────────── */
    {
      id: 'steel',
      name: '철골·구조물 조립·해체',
      keywords: ['철골','해체','철거','구조물','강재','빔','기둥','보','브라켓','볼트','너트','용접','조립','설치','건물','공장','창고','해체','철거','드릴','리벳'],
      tiers: {
        '① 본질적 대책': [
          '지상 선조립 후 대형 블록 인양 방식으로 고소 조립작업 최소화',
          '볼트 체결 방식을 자동 토크 렌치로 전환 (작업자 과부하 저감)',
          '해체 순서 역구조 해석을 통해 구조체 도괴 위험 최소 순서로 계획'
        ],
        '② 공학적 대책': [
          '철골 조립 작업발판 및 안전난간 선설치 후 작업 (규칙 §381)',
          '볼트 체결 전 임시 고정 클립 설치 — 부재 낙하 방지',
          '해체 작업 반경 내 방호 선반(낙하물 방지망) 설치',
          '철골 부재 적치 시 전도 방지 받침목·고임목 설치',
          '용접 연결부 비파괴 검사(UT·MT) 실시 후 하중 적용'
        ],
        '③ 행정적 대책': [
          '철골 작업 작업지휘자 지정 및 구조검토서 검토',
          '해체계획서 작성 — 해체 순서·방법·안전조치 포함 (규칙 §396)',
          '강풍(10m/s)·강우 시 작업 중지 기준 수립',
          '크레인 신호수·안전관리자 동시 배치',
          '인근 주민·통행인 보호 방호 시설 설치'
        ],
        '④ 보호구 착용': [
          '안전대(전신하네스) 착용 및 구명줄 체결',
          '안전모 착용',
          '안전화 착용',
          '안전장갑 착용 — 날카로운 절단면 접촉 방지',
          '보안경 착용 — 용접·그라인더 작업 시'
        ]
      },
      source: '산안기준규칙 §381~§440, KOSHA GUIDE C-11·C-46'
    },

    /* ────────────── 9. 도장 / 방수 / 마감 ────────────── */
    {
      id: 'painting',
      name: '도장·방수·마감',
      keywords: ['도장','도료','페인트','에폭시','방수','프라이머','코팅','스프레이','분무','유기용제','시너','락카','우레탄','방청','도막','희석제','톨루엔','자일렌','냄새','환기'],
      tiers: {
        '① 본질적 대책': [
          '유기용제 함유 도료를 수성 도료로 대체 (VOC 저감)',
          '스프레이 도장을 롤러·붓 도장으로 전환 — 비산 최소화',
          '밀폐구역 도장 작업 외부로 이전 (작업환경 개선)'
        ],
        '② 공학적 대책': [
          '국소배기장치(LEV) 설치 및 포착속도 0.5m/s 이상 유지 (규칙 §428)',
          '자연환기가 불가능한 밀폐 구역: 강제 급·배기 환기 설비 설치',
          '도장 작업 반경 내 점화원(용접·흡연) 제거 및 방폭형 조명 사용',
          '유기용제 밀폐 보관 용기 사용, 보관량 최소화',
          '세척·폐도료 폐기물 전용 용기 사용'
        ],
        '③ 행정적 대책': [
          'MSDS 비치·교육 의무화 — 사용 도료 전 품목 (규칙 §420)',
          '도장 작업 전 산소·가스 농도 측정 (밀폐 구역 시)',
          '화기작업 허가서(PTW) — 도장 구역 내 화기작업 엄금',
          '도장 작업 후 충분한 환기 시간(30분 이상) 확보 후 밀폐',
          '근로자 특수건강검진(유기용제) 주기 관리'
        ],
        '④ 보호구 착용': [
          '방독마스크 착용 (유기화합물용 정화통)',
          '보안경 또는 고글 착용',
          '불침투성 장갑(내화학성) 착용',
          '방호복(도료 오염 방지 전신복) 착용',
          '안전화 착용'
        ]
      },
      source: '산안기준규칙 §420~§450, KOSHA GUIDE H-1·H-65'
    },

    /* ────────────── 10. 밀폐공간 작업 ────────────── */
    {
      id: 'confined',
      name: '밀폐공간 작업',
      keywords: ['밀폐','맨홀','탱크','저장조','피트','지하','갱내','하수','오수','질식','산소결핍','황화수소','일산화탄소','이산화탄소','메탄','암모니아','이산화황'],
      tiers: {
        '① 본질적 대책': [
          '밀폐공간 내부 작업을 외부 원격 조작 장비로 대체',
          '배관·탱크 외부 접근 방식으로 설비 재설계',
          '자동화 세척·검사 장비 도입으로 내부 진입 최소화'
        ],
        '② 공학적 대책': [
          '작업 전·중 산소 농도 18% 이상, 유해가스 허용기준 이하 연속 측정 (규칙 §619)',
          '강제 환기장치(급기 덕트) 설치 — 공기 치환 후 입장',
          '비상 구조용 사다리·삼각대·인양기 현장 비치',
          '내부-외부 영상·음성 통신 장비 지급',
          '탈출 구조 장비(구명줄, 하네스) 내부 작업자에게 장착'
        ],
        '③ 행정적 대책': [
          '밀폐공간 작업허가서(PTW) 발행 의무 (규칙 §619)',
          '밀폐공간 감시인 상주 지정 — 작업 중 이탈 금지',
          '비상대피 신호 약속 및 비상연락망 수립',
          '밀폐공간 작업 특별교육 이수자만 투입 (16시간)',
          '작업 종료 시 인원 전원 확인 후 밀폐'
        ],
        '④ 보호구 착용': [
          '공기호흡기(SCBA) 착용 — 산소결핍·유독가스 위험 시',
          '송기마스크(전동팬형) 착용 — 장시간 작업',
          '안전대 + 구명줄 착용 (비상 인양용)',
          '안전모·안전화 착용'
        ]
      },
      source: '산안기준규칙 §618~§636, KOSHA GUIDE H-80·C-50'
    },

    /* ────────────── 11. 화학물질 / 위험물 취급 ────────────── */
    {
      id: 'chemical_wp',
      name: '화학물질·위험물 취급',
      keywords: ['화학','약품','유해','산','알카리','부식','독성','증기','가스','세척','희석','혼합','중화','반응','누출','저장','MSDS','GHS','폭발','인화','발화'],
      tiers: {
        '① 본질적 대책': [
          '독성이 강한 화학물질을 독성이 낮은 대체물질로 교체 (MSDS 비교 검토)',
          '밀폐형 자동 이송 공정 도입 — 작업자 직접 접촉 제거',
          '취급량 최소화 — 1일 사용량만 현장 반입'
        ],
        '② 공학적 대책': [
          '국소배기장치(LEV) 설치 및 포착속도 정기 측정 (규칙 §429)',
          '비상세척설비(긴급 샤워·세안기) 30m 이내 설치 (규칙 §432)',
          '화학물질 누출 차단 방류벽(Bund Wall) 설치',
          '가스·증기 감지기 설치 및 경보 연동',
          '화학물질 보관 창고: 방폭·환기·소화설비 완비'
        ],
        '③ 행정적 대책': [
          'MSDS 작업장 비치 및 취급 전 교육 (규칙 §420)',
          '화학물질 취급 절차서(SOP) 수립·게시',
          '화학물질 누출 비상대응 절차 수립 및 훈련',
          '혼재 금지 물질 별도 보관 (규칙 §225)',
          '근로자 특수건강검진 주기적 실시'
        ],
        '④ 보호구 착용': [
          '방독마스크(용도별 정화통) 착용',
          '내화학성 장갑 착용',
          '보안경(고글형) 착용',
          '불침투성 보호복 착용',
          '내화학성 안전화 착용'
        ]
      },
      source: '산안기준규칙 §420~§460, KOSHA GUIDE H-1·H-4'
    },

    /* ────────────── 12. 중량물 / 인력 운반 ────────────── */
    {
      id: 'manual_handling',
      name: '중량물·인력운반',
      keywords: ['중량물','인력','운반','들기','허리','요통','근골격','무거운','하역','적재','적치','이동','반복','자재','쌓기','내리기','밀기','끌기'],
      tiers: {
        '① 본질적 대책': [
          '25kg 초과 중량물은 기계 운반(지게차·호이스트) 의무화',
          '자재 단위 포장 중량 25kg 이하로 분할 요청',
          '작업장 레이아웃 개선으로 운반 거리·계단 최소화'
        ],
        '② 공학적 대책': [
          '핸드트럭·대차·전동 리프트 등 운반 보조기구 비치',
          '작업대 높이 조절 기능 설치 (허리 굴곡 최소화)',
          '경사로 구배 완화 및 바닥 미끄럼 방지 처리',
          '수직 운반 구간 리프트·컨베이어 설치'
        ],
        '③ 행정적 대책': [
          '근골격계 부담작업 유해요인 조사 연 1회 실시 (규칙 §657)',
          '중량물 2인 1조 작업 원칙 수립',
          '올바른 들기 자세(허리 굴곡 최소화) 교육 및 포스터 부착',
          '작업 전·후 스트레칭 프로그램 운영',
          '중량물 중량 표시 의무화'
        ],
        '④ 보호구 착용': [
          '요추 보호대(허리 벨트) 착용',
          '안전화 착용 — 발끝 충격 보호',
          '안전장갑 착용',
          '무릎 보호대 착용 — 반복 쪼그림 작업 시'
        ]
      },
      source: '산안기준규칙 §657~§672, KOSHA GUIDE H-9·H-31'
    }
  ],

  // ── 공종·작업명·위험요인 텍스트에서 카테고리 감지 ──────
  _detectWPCategories(text) {
    const t = text.toLowerCase();
    // 공종 DB + 사고유형 DB(Accident) 모두 검색
    const wpMatched = this.WP_WORK_DB.filter(db =>
      db.keywords.some(kw => t.includes(kw))
    );
    // 위험요인 키워드는 Accident DB도 참조
    const accMatched = (typeof Accident !== 'undefined' ? Accident.PREVENTION_DB : [])
      .filter(db => db.id !== 'general')
      .filter(db => db.keywords.some(kw => t.includes(kw)))
      // WP DB와 중복되는 유형 제거 (이름이 비슷한 것)
      .filter(acc => !wpMatched.some(wp =>
        wp.name.includes(acc.name.substring(0, 2)) || acc.name.includes(wp.name.substring(0, 2))
      ));

    const combined = [...wpMatched, ...accMatched];
    if (!combined.length) {
      // 매칭 없으면 일반 대책 (Accident general 활용)
      const gen = typeof Accident !== 'undefined'
        ? Accident.PREVENTION_DB.find(d => d.id === 'general')
        : null;
      return gen ? [gen] : [];
    }
    return combined.slice(0, 4); // 최대 4개 유형
  },

  // ── 재해유형 → Risk.hazardDB 키 매핑 ─────────────────────
  _DISASTER_HAZARD_MAP: {
    끼임:         '협착',
    떨어짐:       '추락',
    부딪힘:       '낙하',
    물체에맞음:   '낙하',
    화재폭발:     '화재폭발',
    전도:         '전도미끄럼',
    감전:         '전기',
    근골격계질환: '중량물',
    기타:         null
  },

  // ── AI 추천 버튼 클릭 ──────────────────────────────────
  suggestMeasures() {
    const disasterChecked = [...document.querySelectorAll('input[name="wp-disaster"]:checked')]
                              .map(cb => cb.value);
    const workName = (document.getElementById('wp-work-name').value || '').trim();
    const content  = (document.getElementById('wp-content').value  || '').trim();
    const hazards  = (document.getElementById('wp-hazards').value  || '').trim();

    const container = document.getElementById('wp-suggest-categories');
    if (!container) return;

    const tierOrder = ['① 본질적 대책','② 공학적 대책','③ 행정적 대책','④ 보호구 착용'];
    const tierClass = { '① 본질적 대책':'prev-tier-1','② 공학적 대책':'prev-tier-2','③ 행정적 대책':'prev-tier-3','④ 보호구 착용':'prev-tier-4' };
    const tierIcon  = { '① 본질적 대책':'🔴','② 공학적 대책':'🟠','③ 행정적 대책':'🟢','④ 보호구 착용':'🔵' };
    const tierDesc  = { '① 본질적 대책':'제거·대체(최우선)','② 공학적 대책':'설비·환경 개선','③ 행정적 대책':'절차·교육·관리','④ 보호구 착용':'마지막 수단' };

    const tierMap = {};
    tierOrder.forEach(t => { tierMap[t] = []; });

    const tierKeyMap = { '① 본질적 대책':'본질적','② 공학적 대책':'공학적','③ 행정적 대책':'행정적','④ 보호구 착용':'보호구' };

    let html = '';
    let sourceLabel = '';

    // ── 1순위: 재해유형 체크박스 선택 시 Risk.hazardDB 활용 ──
    if (disasterChecked.length && typeof Risk !== 'undefined') {
      const hitLabels = [];
      disasterChecked.forEach(type => {
        const dbKey = this._DISASTER_HAZARD_MAP[type];
        if (dbKey && Risk.hazardDB[dbKey]) {
          hitLabels.push(type);
          const db = Risk.hazardDB[dbKey];
          tierOrder.forEach(tier => {
            const key = tierKeyMap[tier];
            (db[key] || []).forEach(item => {
              if (!tierMap[tier].includes(item)) tierMap[tier].push(item);
            });
          });
        } else if (type === '기타') {
          hitLabels.push(type);
          if (!tierMap['① 본질적 대책'].includes('위험 원천 제거 또는 안전한 공법으로 대체 검토'))
            tierMap['① 본질적 대책'].push('위험 원천 제거 또는 안전한 공법으로 대체 검토');
          if (!tierMap['③ 행정적 대책'].includes('TBM 시 위험요인 공유 및 작업 전 안전점검'))
            tierMap['③ 행정적 대책'].push('TBM 시 위험요인 공유 및 작업 전 안전점검');
          if (!tierMap['④ 보호구 착용'].includes('작업 특성에 맞는 보호구 착용 의무화'))
            tierMap['④ 보호구 착용'].push('작업 특성에 맞는 보호구 착용 의무화');
        }
      });
      if (hitLabels.length) {
        sourceLabel = `🎯 재해유형 선택: ${hitLabels.join(', ')}`;
      }
    }

    // ── 2순위: 공종·작업내용·위험요인 텍스트 키워드 분석 병합 ──
    const fullText = `${workName} ${content} ${hazards}`;
    const categories = this._detectWPCategories(fullText);
    const srcSet = new Set(categories.map(c => c.source).filter(Boolean));
    categories.forEach(cat => {
      tierOrder.forEach(tier => {
        (cat.tiers[tier] || []).forEach(item => {
          if (!tierMap[tier].includes(item)) tierMap[tier].push(item);
        });
      });
    });

    const hasDisasterHits = disasterChecked.length > 0;
    const hasCategoryHits = categories.length && categories[0].id !== 'general';

    if (sourceLabel) {
      html += `<div style="font-size:11px;color:var(--primary);font-weight:700;padding:4px 2px 4px">
        ${sourceLabel}
      </div>`;
    }
    if (hasCategoryHits) {
      html += `<div style="font-size:11px;color:var(--gray-600);font-weight:600;padding:2px 2px 8px">
        🔍 공종/위험 감지: ${categories.filter(c=>c.id!=='general').map(c=>`<strong>${c.name}</strong>`).join(', ')}
      </div>`;
    }
    if (!sourceLabel && !hasCategoryHits) {
      html += `<div style="font-size:11px;color:var(--gray-500);padding:4px 2px 8px">
        ⚠️ 재해유형 선택 또는 위험요인을 입력하면 맞춤 안전대책이 제안됩니다
      </div>`;
    }

    tierOrder.forEach((tier, idx) => {
      const items = tierMap[tier];
      if (!items.length) return;
      html += `<div class="prev-tier ${tierClass[tier]}">
        <div class="prev-tier-header">
          ${tierIcon[tier]} ${tier}
          <span class="prev-tier-badge">${tierDesc[tier]}</span>
        </div>
        <div class="prev-items">`;
      items.forEach((item, i) => {
        const cbId = `wp_prev_${idx}_${i}`;
        html += `<label class="prev-item" for="${cbId}">
          <input type="checkbox" id="${cbId}" value="${App.escapeHtml(item)}"
                 onchange="this.closest('.prev-item').classList.toggle('checked', this.checked)">
          <span class="prev-item-text">${App.escapeHtml(item)}</span>
        </label>`;
      });
      html += `</div></div>`;
    });

    if (srcSet.size) {
      html += `<div class="prev-source" style="padding:6px 2px 4px">
        📚 출처: ${[...srcSet].join(' / ')}
      </div>`;
    }

    container.innerHTML = html;
    document.getElementById('wp-suggest-modal').classList.remove('hidden');
  },

  _toggleItem(label) {
    const cb = label.querySelector('input[type="checkbox"]');
    label.classList.toggle('checked', cb.checked);
  },

  // ── 선택 항목 적용 ────────────────────────────────────
  applyMeasures() {
    const checked = document.querySelectorAll('#wp-suggest-categories input[type="checkbox"]:checked');
    if (!checked.length) { App.showToast('항목을 하나 이상 선택하세요'); return; }

    const tierOrder = ['① 본질적 대책','② 공학적 대책','③ 행정적 대책','④ 보호구 착용'];
    const byTier = {};
    tierOrder.forEach(t => { byTier[t] = []; });

    checked.forEach(cb => {
      const label = cb.closest('.prev-item');
      const tierHeader = label.closest('.prev-tier').querySelector('.prev-tier-header');
      const tierName = tierOrder.find(t => tierHeader.textContent.includes(t)) || '';
      if (tierName) byTier[tierName].push(cb.value);
    });

    const lines = [];
    tierOrder.forEach(tier => {
      if (byTier[tier].length) {
        lines.push(`[${tier}]`);
        byTier[tier].forEach(item => lines.push(`• ${item}`));
      }
    });

    const ta = document.getElementById('wp-measures');
    const existing = ta.value.trim();
    ta.value = existing ? existing + '\n\n' + lines.join('\n') : lines.join('\n');

    this.closeModal();
    App.showToast(`✓ ${checked.length}개 안전대책 적용 완료`);
  },

  // ── 모달 닫기 ─────────────────────────────────────────
  closeModal(event) {
    if (event) {
      const overlay = document.getElementById('wp-suggest-modal');
      if (event.target !== overlay) return;
    }
    document.getElementById('wp-suggest-modal').classList.add('hidden');
  }
};
