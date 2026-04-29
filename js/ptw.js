// ===== PTW Module (작업허가서 / Permit To Work) =====
const PTW = {

  // 작업별 사전 체크항목 (안전작업허가서 양식 기준)
  checklists: {
    fire: {
      label: '🔥 화기작업',
      items: [
        '불꽃·불티 비산방지조치',
        '압력조정기 부착 및 작동 상태',
        '인화성물질 제거 상태',
        '소화기 배치 유무',
        '역화방지기 정상가동 상태',
        '작업장소 환기 여부',
        '가연성·독성가스 농도 측정',
        '화재감시자 배치'
      ]
    },
    heavy: {
      label: '⚖️ 중량물작업',
      items: [
        '감독자 지정 및 상주 여부',
        '로프 상태(파단 및 소손) 확인',
        '작업 신호자 지정 여부',
        '적재물 이동 경로의 적정성',
        '관계자 외 출입통제 조치'
      ]
    },
    confined: {
      label: '🏭 밀폐공간작업',
      items: [
        '산소농도 측정 (18~23.5%)',
        '유해가스 농도 측정 (CO 30ppm 미만, H₂S 10ppm 미만)',
        '2인 1조 작업 유무',
        '환기 및 배기장치 조치',
        '출입금지 표지판 설치',
        '연락수단의 적정 유무',
        '개인보호구 착용 상태'
      ]
    },
    height: {
      label: '🏗️ 고소작업',
      items: [
        '2인 1조 작업 유무',
        '추락위험 방호막 구비 상태',
        '사다리 파손 여부',
        '이동식비계 안전인증 유무',
        '작업지지대 작동 상태',
        '안전모 착용 상태',
        '안전대(2m 이상 시) 착용 상태'
      ]
    },
    excavation: {
      label: '⛏️ 굴착작업',
      items: [
        '전기동력선 안전한 배치조치',
        '제어용 케이블 안전성 유지',
        '지하배관 파악 여부',
        '출입금지 표지판 설치',
        '연락수단의 적정 유무',
        '개인보호구 착용 상태',
        '작업장소 정리정돈 상태',
        '굴착사업자 사전 확인 상태'
      ]
    },
    electric: {
      label: '⚡ 전기작업',
      items: [
        '작업안내 표지판 설치',
        '작업자 자격 여부',
        '접지 및 방전 여부',
        '정전작업 전로 개폐 시건',
        '잔류전하 방전 확인',
        '기타 조치사항'
      ]
    }
  },

  checkResults:       {},
  requestorSig:       null,
  checkerSig:         null,
  approverSig:        null,
  _linkedWorkPlanId:  null,   // 연동된 작업계획서 Firebase ID

  init() {
    this.form = document.getElementById('ptw-form');
    // 폼 제출
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.save(); });
  },

  // 작업유형 토글 (버튼 방식 — 모든 기기 호환)
  toggleType(btn) {
    btn.classList.toggle('selected');
    this.renderChecklists();
  },

  // 현재 선택된 작업유형 배열 반환
  getSelectedTypes() {
    return Array.from(document.querySelectorAll('.ptw-type-item.selected'))
      .map(btn => btn.dataset.type);
  },

  onPageShow() {
    // 서명 캔버스 초기화 (페이지 표시 후 크기 확정)
    if (!this.requestorSig) {
      this.requestorSig = new SignatureCanvas(
        document.getElementById('ptw-req-canvas'),
        document.getElementById('ptw-req-clear')
      );
      this.checkerSig = new SignatureCanvas(
        document.getElementById('ptw-chk-canvas'),
        document.getElementById('ptw-chk-clear')
      );
      this.approverSig = new SignatureCanvas(
        document.getElementById('ptw-apr-canvas'),
        document.getElementById('ptw-apr-clear')
      );
    }
    this.requestorSig.resize();
    this.checkerSig.resize();
    this.approverSig.resize();

    // 작업계획서 연동 알림 렌더
    this._renderWPNotifications();
  },

  // ── 작업계획서 연동 알림 패널 ───────────────────────────────
  _renderWPNotifications() {
    const panel   = document.getElementById('ptw-wp-notifications');
    if (!panel) return;
    const pending = JSON.parse(localStorage.getItem('wp_ptw_pending') || '[]');

    if (!pending.length) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }

    const fmt = iso => iso ? iso.replace('T', ' ').slice(0, 16) : '-';

    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="ptw-wp-notice-panel">
        <div class="ptw-wp-notice-header">
          <span class="ptw-wp-notice-icon">📋</span>
          <span class="ptw-wp-notice-title">작업계획서 연동 대기 <span class="ptw-wp-notice-cnt">${pending.length}건</span></span>
          <button type="button" class="ptw-wp-notice-dismiss-all" onclick="PTW._dismissAllWP()">전체 해제</button>
        </div>
        <div class="ptw-wp-notice-list">
          ${pending.map((wp, i) => `
            <div class="ptw-wp-card" id="ptw-wp-card-${i}">
              <div class="ptw-wp-card-info">
                <p class="ptw-wp-card-name">🔧 ${App.escapeHtml(wp.workName)}</p>
                <p class="ptw-wp-card-meta">
                  <span>📅 ${wp.date}</span>
                  <span>🏢 ${App.escapeHtml(wp.company)}</span>
                  <span>📍 ${App.escapeHtml(wp.location)}</span>
                  <span>👷 ${wp.workers}명</span>
                </p>
                <p class="ptw-wp-card-time">저장: ${fmt(wp.savedAt)}</p>
              </div>
              <div class="ptw-wp-card-actions">
                <button type="button" class="ptw-wp-link-btn" onclick="PTW._linkFromWP(${i})">
                  🔗 양식 불러오기
                </button>
                <button type="button" class="ptw-wp-skip-btn" onclick="PTW._dismissWP(${i})">무시</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  },

  // 작업계획서 → PTW 양식 자동 연동
  _linkFromWP(idx) {
    const pending = JSON.parse(localStorage.getItem('wp_ptw_pending') || '[]');
    const wp = pending[idx];
    if (!wp) return;

    // 기본 정보 채우기
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('ptw-date',       wp.date);
    set('ptw-company',    wp.company);
    set('ptw-req-name',   wp.supervisor);
    set('ptw-location',   wp.location);
    set('ptw-workers',    wp.workers);

    // 작업기간: date ~ period 끝날짜 자동 세팅
    if (wp.date) {
      set('ptw-period-start', wp.date + 'T08:00');
      // 작업기간 문자열에서 종료일 파싱 시도
      const periodMatch = (wp.period || '').match(/(\d{4}[.\-]\d{2}[.\-]\d{2})\s*[~\-]\s*(\d{4}[.\-]\d{2}[.\-]\d{2})/);
      if (periodMatch) {
        set('ptw-period-end', periodMatch[2].replace(/\./g, '-') + 'T18:00');
      } else {
        set('ptw-period-end', wp.date + 'T18:00');
      }
    }

    // 작업내용에 작업명 + 세부내용 합산
    const workEl = document.getElementById('ptw-work-name');
    if (workEl) workEl.value =
      [wp.workName, wp.content].filter(Boolean).join('\n\n');

    // 요청사항에 위험요인 + 안전대책 자동 기입
    const notesEl = document.getElementById('ptw-req-notes');
    if (notesEl) {
      const parts = [];
      if (wp.hazards)  parts.push(`[위험요인]\n${wp.hazards}`);
      if (wp.measures) parts.push(`[안전대책]\n${wp.measures}`);
      notesEl.value = parts.join('\n\n');
    }

    // 연동 완료 — pending 에서 제거
    pending.splice(idx, 1);
    localStorage.setItem('wp_ptw_pending', JSON.stringify(pending));
    App.updatePTWBadge();
    this._renderWPNotifications();

    // 연동된 작업계획서 ID 저장 (추적용)
    this._linkedWorkPlanId = wp.id;

    App.showToast('✅ 작업계획서 정보가 양식에 연동됐습니다');
    // 양식 상단으로 스크롤
    document.getElementById('ptw-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  _dismissWP(idx) {
    const pending = JSON.parse(localStorage.getItem('wp_ptw_pending') || '[]');
    pending.splice(idx, 1);
    localStorage.setItem('wp_ptw_pending', JSON.stringify(pending));
    App.updatePTWBadge();
    this._renderWPNotifications();
  },

  _dismissAllWP() {
    localStorage.removeItem('wp_ptw_pending');
    App.updatePTWBadge();
    this._renderWPNotifications();
    App.showToast('연동 알림이 모두 해제됐습니다');
  },

  renderChecklists() {
    const container = document.getElementById('ptw-checklists');
    container.innerHTML = '';

    // 기존 체크결과 중 현재 선택된 타입에 해당하는 것만 보존
    const selectedTypes = this.getSelectedTypes();
    const prevResults = this.checkResults || {};
    this.checkResults = {};
    Object.entries(prevResults).forEach(([key, val]) => {
      const keyType = key.split('_')[0];
      if (selectedTypes.includes(keyType)) this.checkResults[key] = val;
    });
    const selected = selectedTypes.map(t => ({ value: t }));
    if (selected.length === 0) {
      container.innerHTML = '<p class="empty-state" style="padding:12px 0;font-size:13px">작업유형을 선택하면 체크항목이 표시됩니다</p>';
      return;
    }

    selected.forEach(cb => {
      const type = cb.value;
      const cl = this.checklists[type];
      if (!cl) return;

      const div = document.createElement('div');
      div.className = 'ptw-cl-group';

      let html = `<div class="ptw-cl-title">${cl.label} 사전 체크항목</div>`;
      cl.items.forEach((item, idx) => {
        const key = `${type}_${idx}`;
        html += `
          <div class="check-item">
            <label>${item}</label>
            <div class="check-status">
              <button type="button" onclick="PTW.setCheck('${key}','pass',this)">적합</button>
              <button type="button" onclick="PTW.setCheck('${key}','fail',this)">부적합</button>
              <button type="button" onclick="PTW.setCheck('${key}','na',this)">N/A</button>
            </div>
          </div>`;
      });

      div.innerHTML = html;
      container.appendChild(div);
    });

    // 보존된 체크결과 버튼 시각 상태 복원
    Object.entries(this.checkResults).forEach(([key, val]) => {
      const btns = container.querySelectorAll(`.check-status button[onclick*="'${key}',"]`);
      btns.forEach(b => b.className = '');
      const classMap = { pass: 'active-pass', fail: 'active-fail', na: 'active-na' };
      const target = [...btns].find(b => b.getAttribute('onclick').includes(`'${val}'`));
      if (target) target.className = classMap[val] || '';
    });
  },

  setCheck(key, status, btn) {
    this.checkResults[key] = status;
    btn.parentElement.querySelectorAll('button').forEach(b => b.className = '');
    btn.className = { pass: 'active-pass', fail: 'active-fail', na: 'active-na' }[status];
  },

  // 확인 결과 라디오 커스텀 버튼 선택
  selectRadio(btn) {
    const group = btn.dataset.radio;
    document.querySelectorAll(`.ptw-radio-item[data-radio="${group}"]`)
      .forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },

  // 확인 결과 값 읽기
  getRadioValue(group) {
    const sel = document.querySelector(`.ptw-radio-item[data-radio="${group}"].selected`);
    return sel ? sel.dataset.value : '';
  },

  // 결재 상태 계산
  calcStatus() {
    const hasApprover = this.approverSig && !this.approverSig.isEmpty();
    const hasChecker  = this.checkerSig  && !this.checkerSig.isEmpty();
    if (hasApprover) return 'approved';
    if (hasChecker)  return 'reviewing';
    return 'submitted';
  },

  async save() {
    const selectedTypes = this.getSelectedTypes();
    if (selectedTypes.length === 0) { App.showToast('작업유형을 1개 이상 선택하세요'); return; }

    const workName  = document.getElementById('ptw-work-name').value.trim();
    const date      = document.getElementById('ptw-date').value;
    const reqName   = document.getElementById('ptw-req-name').value.trim();
    const typeLabels = selectedTypes.map(t => this.checklists[t]?.label || t).join(', ');
    const status    = this.calcStatus();
    const statusMsg = { submitted: '신청', reviewing: '검토 중', approved: '승인' };
    const ok = await App.confirm(
      `<b>${workName || '작업명 미입력'}</b><br>${date} · ${typeLabels}<br>신청자: ${reqName || '—'} · 상태: <b>${statusMsg[status] || status}</b>`,
      { type: 'save', title: '작업허가서를 저장하시겠습니까?', icon: '🔐' }
    );
    if (!ok) return;

    const data = {
      date,
      company:           document.getElementById('ptw-company').value.trim(),
      department:        document.getElementById('ptw-dept').value.trim(),
      position:          document.getElementById('ptw-position').value.trim(),
      requestorName:     reqName,
      workName,
      location:          document.getElementById('ptw-location').value.trim(),
      workers:           document.getElementById('ptw-workers').value.trim(),
      equipment:         document.getElementById('ptw-equipment').value.trim(),
      periodStart:       document.getElementById('ptw-period-start').value,
      periodEnd:         document.getElementById('ptw-period-end').value,
      workTypes:         selectedTypes,
      workTypeLabels:    selectedTypes.map(t => this.checklists[t]?.label || t),
      requestNotes:      document.getElementById('ptw-req-notes').value.trim(),
      checkResults:      Object.assign({}, this.checkResults),
      requestorSignature: this.requestorSig ? this.requestorSig.toDataURL() : '',
      checkerDept:       document.getElementById('ptw-chk-dept').value.trim(),
      checkerName:       document.getElementById('ptw-chk-name').value.trim(),
      checkerResult:     this.getRadioValue('ptw-chk-result'),
      checkerMemo:       document.getElementById('ptw-chk-memo').value.trim(),
      checkerSignature:  this.checkerSig ? this.checkerSig.toDataURL() : '',
      approverDept:      document.getElementById('ptw-apr-dept').value.trim(),
      approverName:      document.getElementById('ptw-apr-name').value.trim(),
      permitContent:     document.getElementById('ptw-permit-content').value.trim(),
      approverSignature: this.approverSig ? this.approverSig.toDataURL() : '',
      linkedWorkPlanId:  this._linkedWorkPlanId || null,  // 연동된 작업계획서 ID
      status,
      createdAt:         new Date().toISOString()
    };

    try {
      await collections.ptw.add(data);
      App.showToast(`✅ 작업허가서 저장 (${statusMsg[data.status]}) 완료`);
      this.resetForm();
      App.updateDashboard();
    } catch (err) {
      App.showToast('저장 오류: ' + err.message);
      console.error(err);
    }
  },

  resetForm() {
    this.form.reset();
    this.checkResults = {};
    document.getElementById('ptw-checklists').innerHTML =
      '<p class="empty-state" style="padding:12px 0;font-size:13px">작업유형을 선택하면 체크항목이 표시됩니다</p>';
    // 작업유형 버튼 선택 해제
    document.querySelectorAll('.ptw-type-item.selected')
      .forEach(b => b.classList.remove('selected'));
    // 확인 결과 라디오 해제
    document.querySelectorAll('.ptw-radio-item.selected')
      .forEach(b => b.classList.remove('selected'));
    if (this.requestorSig) this.requestorSig.clear();
    if (this.checkerSig)   this.checkerSig.clear();
    if (this.approverSig)  this.approverSig.clear();
    this._linkedWorkPlanId = null;
    document.getElementById('ptw-date').value = new Date().toISOString().split('T')[0];
  }
};
