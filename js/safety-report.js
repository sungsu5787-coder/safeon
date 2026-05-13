// ===== SafetyReport — 안전보건구축체계현황 =====
const SafetyReport = {
  _data: null,
  _prevData: null,
  _year: null,
  _month: null,
  _quarter: null,
  _mode: 'month',
  _compare: false,
  _initialized: false,

  onPageShow() {
    if (!this._initialized) {
      this._initialized = true;
      const now = new Date();
      this._year    = now.getFullYear();
      this._month   = now.getMonth() + 1;
      this._quarter = Math.ceil(this._month / 3);

      const inp = document.getElementById('sr-month-input');
      if (inp) {
        inp.value = `${this._year}-${String(this._month).padStart(2, '0')}`;
      }

      const years = [];
      for (let y = this._year; y >= this._year - 5; y--) years.push(y);

      const qYearSel = document.getElementById('sr-quarter-year');
      if (qYearSel) {
        years.forEach(y => {
          const opt = document.createElement('option');
          opt.value = y; opt.textContent = `${y}년`;
          if (y === this._year) opt.selected = true;
          qYearSel.appendChild(opt);
        });
        const qSel = document.getElementById('sr-quarter-q');
        if (qSel) qSel.value = this._quarter;
      }

      const yrSel = document.getElementById('sr-year-select');
      if (yrSel) {
        years.forEach(y => {
          const opt = document.createElement('option');
          opt.value = y; opt.textContent = `${y}년`;
          if (y === this._year) opt.selected = true;
          yrSel.appendChild(opt);
        });
      }
    }
    this.load();
  },

  setMode(mode) {
    this._mode = mode;
    document.querySelectorAll('.sr-mode-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.querySelectorAll('.sr-mode-input').forEach(el => {
      el.style.display = el.dataset.for === mode ? '' : 'none';
    });
  },

  setCompare(val) {
    this._compare = val;
  },

  _getPrevPeriod() {
    const pad = n => String(n).padStart(2, '0');
    const y = this._year - 1;
    if (this._mode === 'quarter') {
      const q = this._quarter;
      const sm = (q - 1) * 3 + 1, em = q * 3;
      return { from: `${y}-${pad(sm)}-01`, to: `${y}-${pad(em)}-31`, label: `${y}년 ${q}분기` };
    } else if (this._mode === 'year') {
      return { from: `${y}-01-01`, to: `${y}-12-31`, label: `${y}년` };
    } else {
      const m = this._month;
      return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-31`, label: `${y}년 ${m}월` };
    }
  },

  _getPeriod() {
    const pad = n => String(n).padStart(2, '0');
    if (this._mode === 'quarter') {
      const y = parseInt(document.getElementById('sr-quarter-year')?.value || this._year);
      const q = parseInt(document.getElementById('sr-quarter-q')?.value || 1);
      this._year = y; this._quarter = q;
      const sm = (q - 1) * 3 + 1;
      const em = q * 3;
      return { from: `${y}-${pad(sm)}-01`, to: `${y}-${pad(em)}-31`, label: `${y}년 ${q}분기` };
    } else if (this._mode === 'year') {
      const y = parseInt(document.getElementById('sr-year-select')?.value || this._year);
      this._year = y;
      return { from: `${y}-01-01`, to: `${y}-12-31`, label: `${y}년` };
    } else {
      const inp = document.getElementById('sr-month-input');
      if (inp && inp.value) {
        const [y, m] = inp.value.split('-');
        this._year = parseInt(y); this._month = parseInt(m);
      }
      const y = this._year, m = this._month;
      return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-31`, label: `${y}년 ${m}월` };
    }
  },

  async load() {
    const container = document.getElementById('sr-content');
    if (!container) return;
    container.innerHTML = '<div class="sr-loading"><span class="sr-spinner"></span> 데이터 불러오는 중...</div>';

    const { from, to } = this._getPeriod();

    try {
      const [tbmSnap, riskSnap, checkSnap, wpSnap, ptwSnap, accSnap] = await Promise.all([
        collections.tbm.where('date', '>=', from).where('date', '<=', to).get(),
        collections.risk.where('date', '>=', from).where('date', '<=', to).get(),
        collections.checklist.where('date', '>=', from).where('date', '<=', to).get(),
        collections.workplan.where('date', '>=', from).where('date', '<=', to).get(),
        collections.ptw.where('date', '>=', from).where('date', '<=', to).get(),
        collections.accident.where('date', '>=', from).where('date', '<=', to).get(),
      ]);

      this._data = {
        tbm:       tbmSnap.docs.map(d => d.data()),
        risk:      riskSnap.docs.map(d => d.data()),
        checklist: checkSnap.docs.map(d => d.data()),
        workplan:  wpSnap.docs.map(d => d.data()),
        ptw:       ptwSnap.docs.map(d => d.data()),
        accident:  accSnap.docs.map(d => d.data()),
      };

      if (this._compare) {
        const { from: pf, to: pt } = this._getPrevPeriod();
        const [pt1, pr1, pc1, pw1, pp1, pa1] = await Promise.all([
          collections.tbm.where('date', '>=', pf).where('date', '<=', pt).get(),
          collections.risk.where('date', '>=', pf).where('date', '<=', pt).get(),
          collections.checklist.where('date', '>=', pf).where('date', '<=', pt).get(),
          collections.workplan.where('date', '>=', pf).where('date', '<=', pt).get(),
          collections.ptw.where('date', '>=', pf).where('date', '<=', pt).get(),
          collections.accident.where('date', '>=', pf).where('date', '<=', pt).get(),
        ]);
        this._prevData = {
          tbm:       pt1.docs.map(d => d.data()),
          risk:      pr1.docs.map(d => d.data()),
          checklist: pc1.docs.map(d => d.data()),
          workplan:  pw1.docs.map(d => d.data()),
          ptw:       pp1.docs.map(d => d.data()),
          accident:  pa1.docs.map(d => d.data()),
        };
      } else {
        this._prevData = null;
      }

      container.innerHTML = this._buildHTML();
    } catch (err) {
      container.innerHTML = `<div class="sr-error">⚠️ 데이터 조회 오류: ${App.escapeHtml(err.message)}</div>`;
    }
  },

  // ── 통계 계산 ────────────────────────────────────────────────
  _stats() { return this._statsFor(this._data); },
  _statsFor(d) {
    // TBM
    const tbmWorkers = d.tbm.reduce((s, t) => s + (parseInt(t.workers) || 0), 0);

    // 안전점검 양호율
    const allRes = d.checklist.flatMap(c => Object.values(c.results || {}));
    const pass   = allRes.filter(v => v === 'pass').length;
    const fail   = allRes.filter(v => v === 'fail').length;
    const na     = allRes.filter(v => v === 'na').length;
    const total  = pass + fail + na;
    const passRate = total ? Math.round(pass / total * 100) : null;

    // 사고 유형별
    const acc = {
      nearmiss:   d.accident.filter(a => a.accidentType === 'nearmiss'   || a.typeCode === 'nearmiss').length,
      safety:     d.accident.filter(a => a.accidentType === 'safety'     || a.typeCode === 'safety').length,
      industrial: d.accident.filter(a => a.accidentType === 'industrial' || a.typeCode === 'industrial').length,
      serious:    d.accident.filter(a => a.accidentType === 'serious'    || a.typeCode === 'serious').length,
    };

    // 작업허가서 상태별
    const ptw = {
      approved:  d.ptw.filter(p => p.status === 'approved').length,
      submitted: d.ptw.filter(p => !p.status || p.status === 'submitted').length,
      rejected:  d.ptw.filter(p => p.status === 'rejected').length,
    };

    // 위험성평가 위험도 분포
    const riskItems = d.risk.flatMap(r => r.items || []);
    const riskHigh  = riskItems.filter(i => i.riskLevel === '상' || (i.frequency * i.severity) >= 15).length;
    const riskMid   = riskItems.filter(i => i.riskLevel === '중' || ((i.frequency * i.severity) >= 8 && (i.frequency * i.severity) < 15)).length;
    const riskLow   = riskItems.filter(i => i.riskLevel === '하' || (i.frequency * i.severity) < 8).length;

    return { tbmWorkers, pass, fail, na, total, passRate, acc, ptw, riskItems, riskHigh, riskMid, riskLow };
  },

  // ── HTML 생성 ─────────────────────────────────────────────────
  _buildHTML() {
    const d  = this._data;
    const st = this._stats();
    const monthLabel = this._getPeriod().label;

    const pct  = (n, t) => t ? `${Math.round(n / t * 100)}%` : '0%';
    const bar  = (n, t, color) => {
      const w = t ? Math.round(n / t * 100) : 0;
      return `<div class="sr-bar-wrap"><div class="sr-bar-fill" style="width:${w}%;background:${color}"></div><span class="sr-bar-label">${n}</span></div>`;
    };

    const pd  = this._prevData;
    const pst = pd ? this._statsFor(pd) : null;
    const prevLabel = pd ? this._getPrevPeriod().label : '';

    // 증감 뱃지
    const delta = (cur, prev, lowerBetter = false) => {
      const diff = cur - prev;
      if (diff === 0) return `<span class="sr-delta-neutral">전년 동일</span>`;
      const up = diff > 0;
      const good = lowerBetter ? !up : up;
      return `<span class="sr-delta-${good ? 'good' : 'bad'}">${up ? '▲' : '▼'}${Math.abs(diff)}</span>`;
    };

    // 검사 카드
    const card = (icon, label, value, sub, color, prevNum, lowerBetter = false) => {
      const deltaHtml = (pd && prevNum !== undefined)
        ? `<div class="sr-stat-prev">전년 ${prevNum} ${delta(parseInt(value), prevNum, lowerBetter)}</div>`
        : '';
      return `
      <div class="sr-stat-card" style="border-top:3px solid ${color}">
        <div class="sr-stat-icon">${icon}</div>
        <div class="sr-stat-value" style="color:${color}">${value}</div>
        <div class="sr-stat-label">${label}</div>
        ${sub ? `<div class="sr-stat-sub">${sub}</div>` : ''}
        ${deltaHtml}
      </div>`;
    };

    const accTotal = d.accident.length;
    const wpTotal  = d.workplan.length;

    return `
      <div class="sr-report" id="sr-report-body">
        <!-- 리포트 헤더 -->
        <div class="sr-report-header">
          <div class="sr-report-title">안전보건구축체계현황</div>
          <div class="sr-report-period">${monthLabel} 종합 보고${pd ? ` (전년대비: ${prevLabel})` : ''}</div>
          <div class="sr-report-meta">SAMHWA SafeOn · 작성일: ${new Date().toLocaleDateString('ko-KR')}</div>
        </div>

        <!-- ① 종합 실적 카드 -->
        <div class="sr-section-title">📊 ${monthLabel} 종합 실적</div>
        <div class="sr-stat-grid">
          ${card('🦺', 'TBM 실시', `${d.tbm.length}회`, `참석인원 ${st.tbmWorkers}명`, '#1a73e8', pd ? `${pd.tbm.length}회` : undefined)}
          ${card('⚠️', '위험성평가', `${d.risk.length}건`, `위험요인 ${st.riskItems.length}건`, '#f9ab00', pd ? `${pd.risk.length}건` : undefined)}
          ${card('✅', '안전점검', `${d.checklist.length}건`, st.passRate !== null ? `양호율 ${st.passRate}%` : '', '#1e8e3e', pd ? `${pd.checklist.length}건` : undefined)}
          ${card('📋', '작업계획서', `${wpTotal}건`, '', '#0288d1', pd ? `${pd.workplan.length}건` : undefined)}
          ${card('🔑', '작업허가서', `${d.ptw.length}건`, `승인 ${st.ptw.approved}건`, '#7b1fa2', pd ? `${pd.ptw.length}건` : undefined)}
          ${card('🚨', '사고 보고', `${accTotal}건`, accTotal === 0 ? '무사고' : `중대 ${st.acc.serious}건`, accTotal === 0 ? '#1e8e3e' : '#d93025', pd ? `${pd.accident.length}건` : undefined, true)}
        </div>

        <!-- 전년 동기 비교 -->
        ${pd ? this._buildCompare(st, pst, monthLabel, prevLabel) : ''}

        <!-- ② 사고 현황 -->
        <div class="sr-section-title">🚨 사고 발생 현황</div>
        <div class="sr-table-wrap">
          <table class="sr-table">
            <thead>
              <tr><th>구분</th><th>아차사고</th><th>안전사고</th><th>산업재해</th><th>중대재해</th><th>합계</th></tr>
            </thead>
            <tbody>
              <tr>
                <td class="sr-td-label">${monthLabel}</td>
                <td class="${st.acc.nearmiss   ? 'sr-td-warn'   : ''}">${st.acc.nearmiss}</td>
                <td class="${st.acc.safety     ? 'sr-td-danger' : ''}">${st.acc.safety}</td>
                <td class="${st.acc.industrial ? 'sr-td-danger' : ''}">${st.acc.industrial}</td>
                <td class="${st.acc.serious    ? 'sr-td-serious': ''}">${st.acc.serious}</td>
                <td class="sr-td-total ${accTotal ? 'sr-td-danger' : 'sr-td-safe'}">${accTotal}</td>
              </tr>
              ${pd ? `<tr class="sr-tr-prev">
                <td class="sr-td-label">전년 (${prevLabel})</td>
                <td>${pst.acc.nearmiss}</td>
                <td>${pst.acc.safety}</td>
                <td>${pst.acc.industrial}</td>
                <td>${pst.acc.serious}</td>
                <td class="sr-td-total">${pd.accident.length}</td>
              </tr>` : ''}
            </tbody>
          </table>
          ${accTotal === 0
            ? '<div class="sr-badge-safe">🏆 무사고 달성</div>'
            : `<div class="sr-badge-danger">⚠️ 사고 ${accTotal}건 발생 — 원인분석 및 재발방지 필요</div>`}
        </div>

        <!-- ③ 안전점검 결과 -->
        <div class="sr-section-title">✅ 안전점검 결과 분석</div>
        ${d.checklist.length === 0
          ? '<div class="sr-no-data">이 달 점검 기록 없음</div>'
          : `<div class="sr-check-summary">
              <div class="sr-check-rate-wrap">
                <div class="sr-check-rate-circle">
                  <svg viewBox="0 0 36 36" class="sr-donut">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e8eaed" stroke-width="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e8e3e" stroke-width="3"
                      stroke-dasharray="${st.passRate || 0} ${100 - (st.passRate || 0)}"
                      stroke-dashoffset="25" stroke-linecap="round"/>
                  </svg>
                  <div class="sr-donut-label">${st.passRate !== null ? st.passRate + '%' : '-'}</div>
                </div>
                <div class="sr-check-rate-info">
                  <div class="sr-check-rate-title">양호율</div>
                  <div class="sr-check-legend"><span class="sr-dot" style="background:#1e8e3e"></span>양호 ${st.pass}건</div>
                  <div class="sr-check-legend"><span class="sr-dot" style="background:#d93025"></span>불량 ${st.fail}건</div>
                  <div class="sr-check-legend"><span class="sr-dot" style="background:#9aa0a6"></span>해당없음 ${st.na}건</div>
                </div>
              </div>
              <div class="sr-check-type-list">
                ${this._checklistRows(d.checklist)}
              </div>
            </div>`}

        <!-- ④ 위험성평가 -->
        <div class="sr-section-title">⚠️ 위험성평가 현황</div>
        ${d.risk.length === 0
          ? '<div class="sr-no-data">이 달 위험성평가 기록 없음</div>'
          : `<div class="sr-table-wrap">${this._riskTable(d.risk, st)}</div>`}

        <!-- ⑤ TBM 실시 현황 -->
        <div class="sr-section-title">🦺 TBM 실시 현황</div>
        ${d.tbm.length === 0
          ? '<div class="sr-no-data">이 달 TBM 기록 없음</div>'
          : `<div class="sr-table-wrap">${this._tbmTable(d.tbm, st)}</div>`}

        <!-- ⑥ 작업허가서 -->
        <div class="sr-section-title">🔑 작업허가서(PTW) 현황</div>
        ${d.ptw.length === 0
          ? '<div class="sr-no-data">이 달 작업허가서 기록 없음</div>'
          : `<div class="sr-ptw-summary">
              <div class="sr-ptw-chip sr-ptw-approved">승인 ${st.ptw.approved}</div>
              <div class="sr-ptw-chip sr-ptw-pending">신청 ${st.ptw.submitted}</div>
              <div class="sr-ptw-chip sr-ptw-rejected">반려 ${st.ptw.rejected}</div>
            </div>
            <div class="sr-table-wrap">${this._ptwTable(d.ptw)}</div>`}

        <!-- ⑦ 작업계획서 -->
        <div class="sr-section-title">📋 작업계획서 현황</div>
        ${d.workplan.length === 0
          ? '<div class="sr-no-data">이 달 작업계획서 기록 없음</div>'
          : `<div class="sr-table-wrap">
              <table class="sr-table">
                <thead><tr><th>일자</th><th>작업명</th><th>업체</th><th>장소</th><th>인원</th></tr></thead>
                <tbody>
                  ${d.workplan.map(w => `<tr>
                    <td>${w.date || '-'}</td>
                    <td>${App.escapeHtml(w.workName || '-')}</td>
                    <td>${App.escapeHtml(w.company || '-')}</td>
                    <td>${App.escapeHtml(w.location || '-')}</td>
                    <td class="sr-td-center">${w.workers || 0}명</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>`}

        <!-- 리포트 푸터 -->
        <div class="sr-report-footer">
          SAMHWA SafeOn · ${monthLabel} 안전보건구축체계현황 · 출력일: ${new Date().toLocaleDateString('ko-KR')}
        </div>
      </div>`;
  },

  // ── 인쇄 ─────────────────────────────────────────────────────
  print() {
    if (!this._data) { App.showToast('먼저 조회를 실행하세요'); return; }

    const monthLabel = this._getPeriod().label;
    const st = this._stats();
    const d  = this._data;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { App.showToast('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); return; }

    win.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>안전보건구축체계현황 — ${monthLabel}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Malgun Gothic','Apple SD Gothic Neo',sans-serif; font-size:11pt; color:#202124; background:#fff; padding:20mm 18mm; }
  h1 { font-size:18pt; font-weight:800; text-align:center; letter-spacing:1px; margin-bottom:4px; }
  .subtitle { text-align:center; font-size:12pt; color:#5f6368; margin-bottom:2px; }
  .meta { text-align:center; font-size:9pt; color:#9aa0a6; margin-bottom:18px; }
  hr { border:none; border-top:2px solid #202124; margin:8px 0 16px; }
  .section { margin-bottom:18px; }
  .sec-title { font-size:12pt; font-weight:700; border-left:4px solid #1a73e8; padding-left:8px; margin-bottom:8px; color:#1a73e8; }
  table { width:100%; border-collapse:collapse; font-size:9.5pt; margin-bottom:6px; }
  th { background:#f1f3f4; font-weight:700; padding:5px 8px; border:1px solid #dadce0; text-align:center; }
  td { padding:5px 8px; border:1px solid #dadce0; vertical-align:middle; }
  td.center { text-align:center; }
  td.label { font-weight:600; background:#f8f9fa; }
  td.danger { color:#d93025; font-weight:700; }
  td.warn { color:#f9ab00; font-weight:600; }
  td.safe { color:#1e8e3e; font-weight:700; }
  td.serious { color:#d93025; font-weight:900; background:#fce8e6; }
  tfoot td { font-weight:700; background:#f1f3f4; }
  .stat-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; margin-bottom:8px; }
  .stat-card { border:1px solid #dadce0; border-radius:6px; padding:8px 6px; text-align:center; }
  .stat-card .val { font-size:16pt; font-weight:800; line-height:1.2; }
  .stat-card .lbl { font-size:8pt; color:#5f6368; margin-top:2px; }
  .stat-card .sub { font-size:8pt; color:#9aa0a6; }
  .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:9pt; font-weight:700; margin:4px 0; }
  .badge-safe { background:#e6f4ea; color:#1e8e3e; }
  .badge-danger { background:#fce8e6; color:#d93025; }
  .risk-chip { display:inline-block; padding:2px 6px; border-radius:4px; font-size:8pt; font-weight:600; margin:1px; }
  .risk-h { background:#fce8e6; color:#d93025; }
  .risk-m { background:#fef7e0; color:#f9ab00; }
  .risk-l { background:#e6f4ea; color:#1e8e3e; }
  .doc-header { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:0; }
  .doc-title-block { flex:1; }
  .doc-title-block h1 { font-size:20pt; font-weight:900; letter-spacing:1.5px; color:#202124; margin-bottom:5px; line-height:1.1; }
  .doc-title-block .subtitle { font-size:11pt; color:#444; font-weight:600; margin-bottom:3px; }
  .doc-title-block .meta { font-size:9pt; color:#888; }
  .approval-wrap { flex-shrink:0; }
  .approval-table { border-collapse:collapse; }
  .approval-table th { background:#f1f3f4; font-size:8pt; font-weight:700; text-align:center; padding:4px 0; border:1px solid #444; width:62px; letter-spacing:0.5px; }
  .approval-table td { height:54px; border:1px solid #444; width:62px; vertical-align:top; padding:3px; }
  .footer { text-align:center; font-size:8pt; color:#9aa0a6; margin-top:8px; padding-top:8px; border-top:1px solid #dadce0; }
  @media print {
    body { padding:10mm 12mm; }
    @page { size: A4; margin:10mm; }
  }
</style>
</head>
<body>
<div class="doc-header">
  <div class="doc-title-block">
    <h1>안전보건구축체계현황</h1>
    <div class="subtitle">${monthLabel} 종합 보고서</div>
    <div class="meta">SAMHWA SafeOn &nbsp;·&nbsp; 작성일: ${new Date().toLocaleDateString('ko-KR')}</div>
  </div>
  <div class="approval-wrap">
    <table class="approval-table">
      <thead><tr><th>담당</th><th></th><th></th></tr></thead>
      <tbody><tr><td></td><td></td><td></td></tr></tbody>
    </table>
  </div>
</div>
<hr>

<div class="section">
  <div class="sec-title">${monthLabel} 종합 실적</div>
  <div class="stat-grid">
    <div class="stat-card" style="border-top:3px solid #1a73e8">
      <div class="val" style="color:#1a73e8">${d.tbm.length}</div>
      <div class="lbl">TBM 실시</div>
      <div class="sub">참석 ${st.tbmWorkers}명</div>
    </div>
    <div class="stat-card" style="border-top:3px solid #f9ab00">
      <div class="val" style="color:#f9ab00">${d.risk.length}</div>
      <div class="lbl">위험성평가</div>
      <div class="sub">위험요인 ${st.riskItems.length}건</div>
    </div>
    <div class="stat-card" style="border-top:3px solid #1e8e3e">
      <div class="val" style="color:#1e8e3e">${d.checklist.length}</div>
      <div class="lbl">안전점검</div>
      <div class="sub">${st.passRate !== null ? `양호율 ${st.passRate}%` : ''}</div>
    </div>
    <div class="stat-card" style="border-top:3px solid #0288d1">
      <div class="val" style="color:#0288d1">${d.workplan.length}</div>
      <div class="lbl">작업계획서</div>
    </div>
    <div class="stat-card" style="border-top:3px solid #7b1fa2">
      <div class="val" style="color:#7b1fa2">${d.ptw.length}</div>
      <div class="lbl">작업허가서</div>
      <div class="sub">승인 ${st.ptw.approved}건</div>
    </div>
    <div class="stat-card" style="border-top:3px solid ${d.accident.length ? '#d93025' : '#1e8e3e'}">
      <div class="val" style="color:${d.accident.length ? '#d93025' : '#1e8e3e'}">${d.accident.length}</div>
      <div class="lbl">사고 보고</div>
      <div class="sub">${d.accident.length === 0 ? '무사고' : `중대 ${st.acc.serious}건`}</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="sec-title">사고 발생 현황</div>
  <table>
    <thead><tr><th>구분</th><th>아차사고</th><th>안전사고</th><th>산업재해</th><th>중대재해</th><th>합계</th></tr></thead>
    <tbody><tr>
      <td class="label">${monthLabel}</td>
      <td class="center ${st.acc.nearmiss   ? 'warn'   : ''}">${st.acc.nearmiss}</td>
      <td class="center ${st.acc.safety     ? 'danger' : ''}">${st.acc.safety}</td>
      <td class="center ${st.acc.industrial ? 'danger' : ''}">${st.acc.industrial}</td>
      <td class="center ${st.acc.serious    ? 'serious': ''}">${st.acc.serious}</td>
      <td class="center ${d.accident.length ? 'danger' : 'safe'}">${d.accident.length}</td>
    </tr></tbody>
  </table>
  <span class="badge ${d.accident.length === 0 ? 'badge-safe' : 'badge-danger'}">${d.accident.length === 0 ? '🏆 무사고 달성' : `⚠️ 사고 ${d.accident.length}건 발생`}</span>
</div>

${d.checklist.length ? `
<div class="section">
  <div class="sec-title">안전점검 결과 분석</div>
  <table>
    <thead><tr><th>점검유형</th><th>점검장소</th><th>일자</th><th>양호</th><th>불량</th><th>해당없음</th><th>양호율</th></tr></thead>
    <tbody>
      ${d.checklist.map(c => {
        const res = Object.values(c.results || {});
        const p2 = res.filter(v => v === 'pass').length;
        const f2 = res.filter(v => v === 'fail').length;
        const n2 = res.filter(v => v === 'na').length;
        const t2 = res.length;
        const r2 = t2 ? Math.round(p2 / t2 * 100) : 0;
        return `<tr>
          <td>${this._esc(c.type || '안전점검')}</td>
          <td>${this._esc(c.location || '-')}</td>
          <td class="center">${c.date || '-'}</td>
          <td class="center safe">${p2}</td>
          <td class="center ${f2 ? 'danger' : ''}">${f2}</td>
          <td class="center">${n2}</td>
          <td class="center ${r2 >= 80 ? 'safe' : r2 >= 60 ? 'warn' : 'danger'}">${r2}%</td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot><tr>
      <td colspan="3" class="center">합계</td>
      <td class="center safe">${st.pass}</td>
      <td class="center ${st.fail ? 'danger' : ''}">${st.fail}</td>
      <td class="center">${st.na}</td>
      <td class="center ${(st.passRate||0) >= 80 ? 'safe' : 'warn'}">${st.passRate !== null ? st.passRate + '%' : '-'}</td>
    </tr></tfoot>
  </table>
</div>` : ''}

${d.risk.length ? `
<div class="section">
  <div class="sec-title">위험성평가 현황</div>
  <table>
    <thead><tr><th>작업명</th><th>장소</th><th>일자</th><th>위험요인</th><th>위험도 분포</th></tr></thead>
    <tbody>
      ${d.risk.map(r => {
        const items = r.items || [];
        const h = items.filter(i => i.riskLevel === '상').length;
        const mid = items.filter(i => i.riskLevel === '중').length;
        const lo  = items.filter(i => i.riskLevel === '하').length;
        return `<tr>
          <td>${this._esc(r.workName || '-')}</td>
          <td>${this._esc(r.location || '-')}</td>
          <td class="center">${r.date || '-'}</td>
          <td class="center">${items.length}건</td>
          <td><span class="risk-chip risk-h">상 ${h}</span><span class="risk-chip risk-m">중 ${mid}</span><span class="risk-chip risk-l">하 ${lo}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

${d.tbm.length ? `
<div class="section">
  <div class="sec-title">TBM 실시 현황</div>
  <table>
    <thead><tr><th>일자</th><th>공종/작업명</th><th>장소</th><th>인원</th><th>관리감독자</th></tr></thead>
    <tbody>
      ${d.tbm.map(t => `<tr>
        <td>${t.date || '-'}</td>
        <td>${this._esc(t.workName || '-')}</td>
        <td>${this._esc(t.location || '-')}</td>
        <td class="center">${t.workers || 0}명</td>
        <td>${this._esc(t.supervisor || '-')}</td>
      </tr>`).join('')}
    </tbody>
    <tfoot><tr><td colspan="3" class="center">합계</td><td class="center">${st.tbmWorkers}명</td><td></td></tr></tfoot>
  </table>
</div>` : ''}

${d.ptw.length ? `
<div class="section">
  <div class="sec-title">작업허가서(PTW) 현황</div>
  <table>
    <thead><tr><th>일자</th><th>작업명</th><th>업체</th><th>상태</th></tr></thead>
    <tbody>
      ${d.ptw.map(p => {
        const stMap = { approved:'✅ 승인', submitted:'📤 신청', rejected:'❌ 반려' };
        return `<tr>
          <td>${p.date || '-'}</td>
          <td>${this._esc(p.workName || '-')}</td>
          <td>${this._esc(p.company || '-')}</td>
          <td class="center ${p.status === 'approved' ? 'safe' : p.status === 'rejected' ? 'danger' : ''}">${stMap[p.status || 'submitted'] || p.status}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

${d.workplan.length ? `
<div class="section">
  <div class="sec-title">작업계획서 현황</div>
  <table>
    <thead><tr><th>일자</th><th>작업명</th><th>업체</th><th>장소</th><th>인원</th></tr></thead>
    <tbody>
      ${d.workplan.map(w => `<tr>
        <td>${w.date || '-'}</td>
        <td>${this._esc(w.workName || '-')}</td>
        <td>${this._esc(w.company || '-')}</td>
        <td>${this._esc(w.location || '-')}</td>
        <td class="center">${w.workers || 0}명</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">SAMHWA SafeOn &nbsp;|&nbsp; ${monthLabel} 안전보건구축체계현황 &nbsp;|&nbsp; 출력일: ${new Date().toLocaleDateString('ko-KR')}</div>
<script>window.onload = () => { window.print(); };<\/script>
</body></html>`);
    win.document.close();
  },

  _buildCompare(st, pst, curLabel, prevLabel) {
    const d = this._data, pd = this._prevData;

    const diffVal = (cur, prev) => {
      const diff = cur - prev;
      if (diff === 0) return '<span class="sr-cmp-neutral">—</span>';
      const up = diff > 0;
      return `<span class="sr-cmp-${up ? 'up' : 'down'}">${up ? '▲' : '▼'}${Math.abs(diff)}</span>`;
    };
    const diffRate = (cur, prev) => {
      if (prev === 0) return cur > 0 ? '<span class="sr-cmp-up">신규</span>' : '—';
      const r = Math.round((cur - prev) / prev * 100);
      return `<span class="sr-cmp-${r > 0 ? 'up' : r < 0 ? 'down' : 'neutral'}">${r > 0 ? '+' : ''}${r}%</span>`;
    };

    const rows = [
      { label: '🦺 TBM 실시',      cur: `${d.tbm.length}회`,        prev: `${pd.tbm.length}회`,        cn: d.tbm.length,       pn: pd.tbm.length },
      { label: '　 참석 인원',       cur: `${st.tbmWorkers}명`,        prev: `${pst.tbmWorkers}명`,        cn: st.tbmWorkers,      pn: pst.tbmWorkers },
      { label: '⚠️ 위험성평가',     cur: `${d.risk.length}건`,        prev: `${pd.risk.length}건`,        cn: d.risk.length,      pn: pd.risk.length },
      { label: '　 위험요인',        cur: `${st.riskItems.length}건`,  prev: `${pst.riskItems.length}건`,  cn: st.riskItems.length, pn: pst.riskItems.length },
      { label: '✅ 안전점검',       cur: `${d.checklist.length}건`,   prev: `${pd.checklist.length}건`,   cn: d.checklist.length, pn: pd.checklist.length },
      { label: '　 양호율',          cur: st.passRate !== null ? `${st.passRate}%` : '-', prev: pst.passRate !== null ? `${pst.passRate}%` : '-', cn: st.passRate ?? 0, pn: pst.passRate ?? 0 },
      { label: '📋 작업계획서',     cur: `${d.workplan.length}건`,    prev: `${pd.workplan.length}건`,    cn: d.workplan.length,  pn: pd.workplan.length },
      { label: '🔑 작업허가서',     cur: `${d.ptw.length}건`,         prev: `${pd.ptw.length}건`,         cn: d.ptw.length,       pn: pd.ptw.length },
      { label: '🚨 사고 발생',      cur: `${d.accident.length}건`,    prev: `${pd.accident.length}건`,    cn: d.accident.length,  pn: pd.accident.length, lower: true },
    ];

    return `
      <div class="sr-section-title">📈 전년 동기 비교</div>
      <div class="sr-table-wrap">
        <table class="sr-table sr-cmp-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>전년 (${prevLabel})</th>
              <th>당기 (${curLabel})</th>
              <th>증감</th>
              <th>증감률</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const diff = r.cn - r.pn;
              const up = diff > 0;
              const good = r.lower ? !up : up;
              const diffCls = diff === 0 ? 'sr-cmp-neutral' : (good ? 'sr-cmp-up' : 'sr-cmp-bad');
              return `<tr>
                <td class="sr-td-label">${r.label}</td>
                <td class="sr-td-center sr-cmp-prev">${r.prev}</td>
                <td class="sr-td-center sr-cmp-cur">${r.cur}</td>
                <td class="sr-td-center"><span class="${diffCls}">${diff === 0 ? '—' : (up ? '▲' : '▼') + Math.abs(diff)}</span></td>
                <td class="sr-td-center">${diffRate(r.cn, r.pn)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  _checklistRows(checklist) {
    if (this._mode === 'month') {
      return checklist.map(c => {
        const res = Object.values(c.results || {});
        const p = res.filter(v => v === 'pass').length;
        const f = res.filter(v => v === 'fail').length;
        const t = res.length;
        const r = t ? Math.round(p / t * 100) : 0;
        return `<div class="sr-check-row">
          <span class="sr-check-type">${App.escapeHtml(c.type || '안전점검')}</span>
          <span class="sr-check-loc">${App.escapeHtml(c.location || '')}</span>
          <span class="sr-check-date">${c.date || ''}</span>
          <div class="sr-mini-bar"><div class="sr-mini-fill" style="width:${r}%;background:#1e8e3e"></div></div>
          <span class="sr-check-pct ${f ? 'sr-pct-bad' : 'sr-pct-good'}">${r}%</span>
        </div>`;
      }).join('');
    }

    // 분기별·년별: 월별로 묶어서 표시
    const byMonth = {};
    checklist.forEach(c => {
      const ym = (c.date || '').substring(0, 7);
      if (!ym) return;
      if (!byMonth[ym]) byMonth[ym] = { count: 0, pass: 0, fail: 0, na: 0 };
      const g = byMonth[ym];
      g.count++;
      Object.values(c.results || {}).forEach(v => {
        if (v === 'pass') g.pass++;
        else if (v === 'fail') g.fail++;
        else if (v === 'na') g.na++;
      });
    });

    return Object.keys(byMonth).sort().map(ym => {
      const g = byMonth[ym];
      const t = g.pass + g.fail + g.na;
      const r = t ? Math.round(g.pass / t * 100) : 0;
      const [y, m] = ym.split('-');
      return `<div class="sr-check-row">
        <span class="sr-check-type">${y}년 ${parseInt(m)}월</span>
        <span class="sr-check-loc">${g.count}건 실시</span>
        <span class="sr-check-date">불량 ${g.fail}건</span>
        <div class="sr-mini-bar"><div class="sr-mini-fill" style="width:${r}%;background:#1e8e3e"></div></div>
        <span class="sr-check-pct ${g.fail ? 'sr-pct-bad' : 'sr-pct-good'}">${r}%</span>
      </div>`;
    }).join('');
  },

  _riskTable(risk, st) {
    if (this._mode === 'month') {
      return `<table class="sr-table">
        <thead><tr><th>작업명</th><th>장소</th><th>일자</th><th>위험요인</th><th>위험도 분포</th></tr></thead>
        <tbody>
          ${risk.map(r => {
            const items = r.items || [];
            const h = items.filter(i => i.riskLevel === '상').length;
            const mid = items.filter(i => i.riskLevel === '중').length;
            const lo = items.filter(i => i.riskLevel === '하').length;
            return `<tr>
              <td>${App.escapeHtml(r.workName || '-')}</td>
              <td>${App.escapeHtml(r.location || '-')}</td>
              <td>${r.date || '-'}</td>
              <td class="sr-td-center">${items.length}건</td>
              <td><span class="sr-risk-chip sr-risk-h">상 ${h}</span> <span class="sr-risk-chip sr-risk-m">중 ${mid}</span> <span class="sr-risk-chip sr-risk-l">하 ${lo}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="sr-risk-total">전체 위험요인 ${st.riskItems.length}건 &nbsp;|&nbsp;
        <span style="color:#d93025">위험 ${st.riskHigh}건</span> ·
        <span style="color:#f9ab00">주의 ${st.riskMid}건</span> ·
        <span style="color:#1e8e3e">양호 ${st.riskLow}건</span>
      </div>`;
    }

    // 분기별·년별: 월별 집계
    const byMonth = {};
    risk.forEach(r => {
      const ym = (r.date || '').substring(0, 7);
      if (!ym) return;
      if (!byMonth[ym]) byMonth[ym] = { count: 0, items: 0, h: 0, mid: 0, lo: 0 };
      const g = byMonth[ym];
      g.count++;
      const items = r.items || [];
      g.items += items.length;
      g.h   += items.filter(i => i.riskLevel === '상').length;
      g.mid += items.filter(i => i.riskLevel === '중').length;
      g.lo  += items.filter(i => i.riskLevel === '하').length;
    });

    return `<table class="sr-table">
      <thead><tr><th>월</th><th>평가 건수</th><th>위험요인</th><th>위험도 분포</th></tr></thead>
      <tbody>
        ${Object.keys(byMonth).sort().map(ym => {
          const g = byMonth[ym];
          const [y, m] = ym.split('-');
          return `<tr>
            <td>${y}년 ${parseInt(m)}월</td>
            <td class="sr-td-center">${g.count}건</td>
            <td class="sr-td-center">${g.items}건</td>
            <td><span class="sr-risk-chip sr-risk-h">상 ${g.h}</span> <span class="sr-risk-chip sr-risk-m">중 ${g.mid}</span> <span class="sr-risk-chip sr-risk-l">하 ${g.lo}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div class="sr-risk-total">전체 위험요인 ${st.riskItems.length}건 &nbsp;|&nbsp;
      <span style="color:#d93025">위험 ${st.riskHigh}건</span> ·
      <span style="color:#f9ab00">주의 ${st.riskMid}건</span> ·
      <span style="color:#1e8e3e">양호 ${st.riskLow}건</span>
    </div>`;
  },

  _tbmTable(tbm, st) {
    if (this._mode === 'month') {
      return `<table class="sr-table">
        <thead><tr><th>일자</th><th>공종/작업명</th><th>장소</th><th>인원</th><th>관리감독자</th></tr></thead>
        <tbody>
          ${tbm.map(t => `<tr>
            <td>${t.date || '-'}</td>
            <td>${App.escapeHtml(t.workName || '-')}</td>
            <td>${App.escapeHtml(t.location || '-')}</td>
            <td class="sr-td-center">${t.workers || 0}명</td>
            <td>${App.escapeHtml(t.supervisor || '-')}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="3" class="sr-td-total-label">합계</td>
          <td class="sr-td-center sr-td-total">${st.tbmWorkers}명</td>
          <td></td>
        </tr></tfoot>
      </table>`;
    }

    // 분기별·년별: 월별 집계
    const byMonth = {};
    tbm.forEach(t => {
      const ym = (t.date || '').substring(0, 7);
      if (!ym) return;
      if (!byMonth[ym]) byMonth[ym] = { count: 0, workers: 0 };
      byMonth[ym].count++;
      byMonth[ym].workers += parseInt(t.workers) || 0;
    });

    return `<table class="sr-table">
      <thead><tr><th>월</th><th>TBM 횟수</th><th>참석 인원</th></tr></thead>
      <tbody>
        ${Object.keys(byMonth).sort().map(ym => {
          const g = byMonth[ym];
          const [y, m] = ym.split('-');
          return `<tr>
            <td>${y}년 ${parseInt(m)}월</td>
            <td class="sr-td-center">${g.count}회</td>
            <td class="sr-td-center">${g.workers}명</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot><tr>
        <td class="sr-td-total-label">합계</td>
        <td class="sr-td-center sr-td-total">${tbm.length}회</td>
        <td class="sr-td-center sr-td-total">${st.tbmWorkers}명</td>
      </tr></tfoot>
    </table>`;
  },

  _ptwTable(ptw) {
    if (this._mode === 'month') {
      return `<table class="sr-table">
        <thead><tr><th>일자</th><th>작업명</th><th>업체</th><th>상태</th></tr></thead>
        <tbody>
          ${ptw.map(p => {
            const stMap = { approved:'✅ 승인', submitted:'📤 신청', rejected:'❌ 반려' };
            const stCls = { approved:'sr-status-ok', submitted:'sr-status-pend', rejected:'sr-status-bad' };
            const st2 = p.status || 'submitted';
            return `<tr>
              <td>${p.date || '-'}</td>
              <td>${App.escapeHtml(p.workName || '-')}</td>
              <td>${App.escapeHtml(p.company || '-')}</td>
              <td class="${stCls[st2] || ''}">${stMap[st2] || st2}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    }

    // 분기별·년별: 월별 집계
    const byMonth = {};
    ptw.forEach(p => {
      const ym = (p.date || '').substring(0, 7);
      if (!ym) return;
      if (!byMonth[ym]) byMonth[ym] = { total: 0, approved: 0, submitted: 0, rejected: 0 };
      const g = byMonth[ym];
      g.total++;
      const s = p.status || 'submitted';
      if (s in g) g[s]++;
    });

    return `<table class="sr-table">
      <thead><tr><th>월</th><th>합계</th><th>승인</th><th>신청</th><th>반려</th></tr></thead>
      <tbody>
        ${Object.keys(byMonth).sort().map(ym => {
          const g = byMonth[ym];
          const [y, m] = ym.split('-');
          return `<tr>
            <td>${y}년 ${parseInt(m)}월</td>
            <td class="sr-td-center">${g.total}건</td>
            <td class="sr-td-center sr-status-ok">${g.approved}건</td>
            <td class="sr-td-center sr-status-pend">${g.submitted}건</td>
            <td class="sr-td-center ${g.rejected ? 'sr-status-bad' : ''}">${g.rejected}건</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  },

  _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
