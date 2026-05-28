// ===== History Module =====
const History = {
  _results: [],   // 현재 조회된 결과 캐시
  _page: 1,
  PAGE_SIZE: 10,

  init() {
    this.listContainer  = document.getElementById('history-list');
    this.pagerContainer = document.getElementById('history-pager');
    this.printArea      = document.getElementById('print-area');
    this.countLabel     = document.getElementById('export-count-label');

    document.getElementById('history-type').addEventListener('change', () => this.loadHistory());
    document.getElementById('history-date-from').addEventListener('change', () => this.loadHistory());
    document.getElementById('history-date-to').addEventListener('change', () => this.loadHistory());

    document.getElementById('btn-export-print').addEventListener('click', () => this.exportPrint());
    document.getElementById('btn-export-csv').addEventListener('click',   () => this.exportCSV());

    const today   = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    document.getElementById('history-date-to').value   = today.toISOString().split('T')[0];
    document.getElementById('history-date-from').value = weekAgo.toISOString().split('T')[0];
  },

  async loadHistory() {
    const type     = document.getElementById('history-type').value;
    const dateFrom = document.getElementById('history-date-from').value;
    const dateTo   = document.getElementById('history-date-to').value;

    this.listContainer.innerHTML = '<p class="empty-state">조회 중...</p>';
    this._results = [];

    const apiBase = window.API_BASE_URL || '';

    try {
      // 안전제안: 별도 API
      const includeProposal = type === 'all' || type === 'proposal';
      if (includeProposal) {
        try {
          const res = await fetch(`${apiBase}/api/proposals`);
          if (res.ok) {
            const data = await res.json();
            (data.proposals || []).forEach(p => {
              const date = p.createdAt ? p.createdAt.split('T')[0] : '';
              if (dateFrom && date < dateFrom) return;
              if (dateTo   && date > dateTo)   return;
              this._results.push({ ...p, date, _collType: 'proposal' });
            });
          }
        } catch (e) { console.warn('[History] 안전제안 로드 실패:', e); }
      }

      if (type === 'proposal') {
        this._results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        if (this.countLabel) this.countLabel.textContent = this._results.length + '건';
        if (!this._results.length) {
          this.listContainer.innerHTML = '<p class="empty-state">조회된 기록이 없습니다.</p>';
          if (this.pagerContainer) this.pagerContainer.innerHTML = '';
          return;
        }
        this._renderPage(1);
        return;
      }

      // 서버 API로 Firestore 이력 조회 (Firebase JS SDK 우회)
      const params = new URLSearchParams({ type });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo)   params.set('dateTo', dateTo);

      const res = await fetch(`${apiBase}/api/history?${params}`);
      if (!res.ok) throw new Error(`서버 오류 ${res.status}`);
      const data = await res.json();

      (data.records || []).forEach(r => this._results.push(r));

      this._results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      if (this.countLabel) {
        this.countLabel.textContent = this._results.length + '건';
      }

      if (this._results.length === 0) {
        this.listContainer.innerHTML = '<p class="empty-state">조회된 기록이 없습니다.</p>';
        if (this.pagerContainer) this.pagerContainer.innerHTML = '';
        return;
      }

      this._renderPage(1);
    } catch (err) {
      console.error('[History] load error:', err);
      this.listContainer.innerHTML = `<p class="empty-state" style="color:#c5221f">⚠️ 데이터 조회 오류: ${err.message}</p>`;
      if (this.countLabel) this.countLabel.textContent = '0건';
      if (this.pagerContainer) this.pagerContainer.innerHTML = '';
    }
  },

  // ── 페이지 렌더 ─────────────────────────────────────────────
  _renderPage(page) {
    const total     = this._results.length;
    const totalPage = Math.ceil(total / this.PAGE_SIZE);
    this._page      = Math.max(1, Math.min(page, totalPage));

    const start = (this._page - 1) * this.PAGE_SIZE;
    const slice = this._results.slice(start, start + this.PAGE_SIZE);

    this.listContainer.innerHTML = slice.map(item => this.renderCard(item)).join('');
    this._renderPager(totalPage);

    // 페이지 이동 시 목록 상단으로 스크롤
    this.listContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  _renderPager(totalPage) {
    if (!this.pagerContainer) return;
    if (totalPage <= 1) { this.pagerContainer.innerHTML = ''; return; }

    const cur = this._page;

    // 표시할 페이지 번호 범위: 현재 페이지 기준 앞뒤 2개
    const WING = 2;
    let rangeStart = Math.max(1, cur - WING);
    let rangeEnd   = Math.min(totalPage, cur + WING);
    // 항상 최소 5개 보이도록 보정
    if (rangeEnd - rangeStart < 4) {
      if (rangeStart === 1) rangeEnd   = Math.min(totalPage, rangeStart + 4);
      else                  rangeStart = Math.max(1, rangeEnd - 4);
    }

    const btn = (label, page, disabled, active) =>
      `<button class="pager-btn${active ? ' pager-active' : ''}"
               ${disabled ? 'disabled' : `onclick="History._renderPage(${page})"`}>${label}</button>`;

    let html = btn('‹', cur - 1, cur === 1, false);

    if (rangeStart > 1) {
      html += btn('1', 1, false, false);
      if (rangeStart > 2) html += `<span class="pager-ellipsis">…</span>`;
    }

    for (let p = rangeStart; p <= rangeEnd; p++) {
      html += btn(p, p, false, p === cur);
    }

    if (rangeEnd < totalPage) {
      if (rangeEnd < totalPage - 1) html += `<span class="pager-ellipsis">…</span>`;
      html += btn(totalPage, totalPage, false, false);
    }

    html += btn('›', cur + 1, cur === totalPage, false);

    this.pagerContainer.innerHTML =
      `<div class="pager-wrap">${html}<span class="pager-info">${cur} / ${totalPage}</span></div>`;
  },

  // ── 인쇄 / PDF ──────────────────────────────────────────────
  exportPrint() {
    if (!this._results.length) { App.showToast('출력할 기록이 없습니다.'); return; }

    const dateFrom   = document.getElementById('history-date-from').value;
    const dateTo     = document.getElementById('history-date-to').value;
    const typeVal    = document.getElementById('history-type').value;
    const typeLabels = { all:'전체', tbm:'TBM', risk:'위험성평가', checklist:'안전점검', workplan:'작업계획서', ptw:'작업허가서', nearmiss:'아차사고', accident:'사고보고서', proposal:'안전제안' };

    const badgeStyle = {
      tbm:       'background:#e8f0fe;color:#1557b0',
      risk:      'background:#fce8e6;color:#c5221f',
      checklist: 'background:#e6f4ea;color:#137333',
      workplan:  'background:#e8f5e9;color:#2e7d32',
      ptw:       'background:#fff3e0;color:#e65100',
      nearmiss:  'background:#fff9c4;color:#f57f17',
      accident:  'background:#fce4ec;color:#880e4f'
    };

    const rows = this._results.map((item, i) => {
      const info = this._getItemInfo(item);
      const statusText = item.status ? this._statusText(item.status) : '-';
      const dType = (item._collType === 'accident' && item.accidentType === 'nearmiss') ? 'nearmiss' : item._collType;
      const bs = badgeStyle[dType] || '';
      return `<tr>
        <td style="width:28px;text-align:center;color:#9aa0a6;font-size:11px">${i + 1}</td>
        <td><span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:8px;white-space:nowrap;${bs}">${typeLabels[dType] || dType}</span></td>
        <td style="width:88px;white-space:nowrap;color:#5f6368;font-size:11px">${App.formatDate(item.date)}</td>
        <td style="font-weight:600">${App.escapeHtml(info.title)}</td>
        <td style="color:#5f6368;font-size:11px">${App.escapeHtml(info.sub)}</td>
        <td style="width:46px;text-align:center;font-size:11px;font-weight:600;color:#1a73e8">${statusText}</td>
      </tr>`;
    }).join('');

    // print-area에 내용 주입 후 window.print() 호출
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
      <div class="print-inner" style="font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:12px;color:#202124;padding:20px">
        <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #1a73e8;padding-bottom:12px;margin-bottom:16px">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,#1a73e8,#0d47a1);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div style="flex:1">
            <div style="font-size:18px;font-weight:800;color:#0d47a1">SAMHWA SafeOn</div>
            <div style="font-size:11px;color:#5f6368;margin-top:2px">삼화 세이프온 — 현장 안전보건 관리 시스템</div>
          </div>
          <div style="text-align:right;font-size:11px;color:#5f6368;line-height:1.7">
            구분: ${typeLabels[typeVal] || typeVal}<br>
            기간: ${dateFrom} ~ ${dateTo}<br>
            총 <strong>${this._results.length}건</strong><br>
            출력: ${new Date().toLocaleString('ko-KR')}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#e8f0fe">
              <th style="padding:8px 10px;text-align:left;font-weight:700;font-size:11px;color:#1557b0;border-bottom:1px solid #c5d5f7">No</th>
              <th style="padding:8px 10px;text-align:left;font-weight:700;font-size:11px;color:#1557b0;border-bottom:1px solid #c5d5f7">구분</th>
              <th style="padding:8px 10px;text-align:left;font-weight:700;font-size:11px;color:#1557b0;border-bottom:1px solid #c5d5f7">일자</th>
              <th style="padding:8px 10px;text-align:left;font-weight:700;font-size:11px;color:#1557b0;border-bottom:1px solid #c5d5f7">제목</th>
              <th style="padding:8px 10px;text-align:left;font-weight:700;font-size:11px;color:#1557b0;border-bottom:1px solid #c5d5f7">세부내용</th>
              <th style="padding:8px 10px;text-align:left;font-weight:700;font-size:11px;color:#1557b0;border-bottom:1px solid #c5d5f7">상태</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;text-align:right;font-size:10px;color:#9aa0a6;border-top:1px solid #e8eaed;padding-top:8px">
          SAMHWA SafeOn · 현장 안전보건 관리 시스템 · ${new Date().toLocaleDateString('ko-KR')} 출력
        </div>
      </div>`;

    App._setPrintOrientation(true); // 이력 테이블은 A4 가로
    App._applyPrintScale(printArea, true);
    setTimeout(() => {
      window.print();
      setTimeout(() => { printArea.innerHTML = ''; printArea.style.cssText = ''; }, 1000);
    }, 150);
  },

  // ── CSV 다운로드 ─────────────────────────────────────────────
  exportCSV() {
    if (!this._results.length) { App.showToast('내보낼 기록이 없습니다.'); return; }

    const typeLabels = { tbm:'TBM', risk:'위험성평가', checklist:'안전점검', workplan:'작업계획서', ptw:'작업허가서', nearmiss:'아차사고', accident:'사고보고서', proposal:'안전제안' };
    const header = ['번호', '구분', '일자', '제목', '세부내용', '상태'];

    const rows = this._results.map((item, i) => {
      const info = this._getItemInfo(item);
      const dType = (item._collType === 'accident' && item.accidentType === 'nearmiss') ? 'nearmiss' : item._collType;
      return [
        i + 1,
        typeLabels[dType] || dType,
        item.date || '',
        '"' + (info.title || '').replace(/"/g, '""') + '"',
        '"' + (info.sub   || '').replace(/"/g, '""') + '"',
        item.status ? this._statusText(item.status) : ''
      ].join(',');
    });

    const csv = '\uFEFF' + [header.join(','), ...rows].join('\r\n'); // BOM for Excel 한글
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);

    const dateFrom = document.getElementById('history-date-from').value;
    const dateTo   = document.getElementById('history-date-to').value;
    const filename = `SafeOn_이력_${dateFrom}_${dateTo}.csv`;

    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    App.showToast(`CSV 저장 완료 (${this._results.length}건)`);
  },

  // ── 헬퍼 ────────────────────────────────────────────────────
  _getItemInfo(item) {
    const t = item._collType;
    let title = '', sub = '';
    if (t === 'tbm') {
      title = item.workName || 'TBM';
      sub   = `${item.location||''} / ${item.workers||0}명`;
    } else if (t === 'risk') {
      title = item.workName || '위험성 평가';
      sub   = `${item.location||''} / ${(item.items||[]).length}건`;
    } else if (t === 'checklist') {
      title = item.type || '안전점검';
      sub   = item.location || '';
    } else if (t === 'workplan') {
      title = item.workName || '작업계획서';
      sub   = `${item.company||''} / ${item.location||''}`;
    } else if (t === 'ptw') {
      title = item.workName || '작업허가서';
      sub   = `${item.company||''} · ${(item.workTypeLabels||[]).join(', ')}`;
    } else if (t === 'accident') {
      title = item.location || '장소 미입력';
      sub   = [item.reporter, item.time].filter(Boolean).join(' · ');
    } else if (t === 'proposal') {
      title = (item.suggestion || '').slice(0, 40) || '안전제안';
      sub   = [item.affiliation, item.department, item.name].filter(Boolean).join(' · ');
    }
    return { title, sub };
  },

  _getInspector(item) {
    const t = item._collType;
    if (t === 'tbm')       return item.supervisor   ? `감독자 ${item.supervisor}`   : '';
    if (t === 'risk')      return item.assessor     ? `평가자 ${item.assessor}`     : '';
    if (t === 'checklist') return item.inspector    ? `점검자 ${item.inspector}`    : '';
    if (t === 'workplan')  return item.supervisor   ? `책임자 ${item.supervisor}`   : '';
    if (t === 'ptw')       return item.requestorName? `신청자 ${item.requestorName}`: '';
    if (t === 'accident')  return item.reporter     ? `보고자 ${item.reporter}`     : '';
    if (t === 'proposal')  return '';
    return '';
  },

  _statusText(status) {
    const map = { submitted:'신청', reviewing:'검토중', approved:'승인', rejected:'반려' };
    return map[status] || status;
  },

  // ── 카드 렌더 ────────────────────────────────────────────────
  renderCard(item) {
    const collType = item._collType;
    // accident 컬렉션이면서 accidentType === 'nearmiss' 인 경우 별도 배지 표시
    const isNearmiss = collType === 'accident' && item.accidentType === 'nearmiss';
    const displayType = isNearmiss ? 'nearmiss' : collType;
    const typeLabels = { tbm:'TBM', risk:'위험성평가', checklist:'안전점검', workplan:'작업계획서', ptw:'작업허가서', nearmiss:'아차사고', accident:'사고보고서', proposal:'안전제안' };
    const badgeClass = { tbm:'badge-tbm', risk:'badge-risk', checklist:'badge-checklist', workplan:'badge-workplan', ptw:'badge-ptw', nearmiss:'badge-nearmiss', accident:'badge-accident', proposal:'badge-proposal' };

    const statusBadge = (item.status && item.status !== 'draft')
      ? this.renderStatusBadge(item.status) : '';

    const info       = this._getItemInfo(item);
    const checkBar   = this._renderCheckBar(item);
    const inspector  = this._getInspector(item);
    const cardPhotos = this._getCardPhotos(item);
    const photoStrip = cardPhotos.length ? this._renderPhotoStrip(cardPhotos, collType, item.id) : '';

    const cardClick = collType === 'proposal'
      ? `History._openProposal('${item.id}')`
      : `App.showDetail('${collType}', '${item.id}')`;

    const cardId = `hc-${collType}-${item.id}`;
    return `
      <div class="history-card" id="${cardId}" onclick="${cardClick}">
        <div class="history-card-header">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span class="history-type-badge ${badgeClass[displayType]||''}">${typeLabels[displayType]||displayType}</span>
            ${statusBadge}
          </div>
          <span class="history-date">${App.formatDate(item.date)}</span>
        </div>
        <div class="history-title">${App.escapeHtml(info.title)}</div>
        <div class="history-sub">${App.escapeHtml(info.sub)}</div>
        ${inspector ? `<div class="history-inspector"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${App.escapeHtml(inspector)}</div>` : ''}
        ${photoStrip}
        <div class="history-card-footer">
          <div class="history-check-bar">${checkBar}</div>
        </div>
        <div class="card-actions" onclick="event.stopPropagation()">
          <div class="card-actions-row">
            <button class="card-action-btn card-action-edit"
                    onclick="History.editItem('${collType}','${item.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              수정
            </button>
            <button class="card-action-btn card-action-capture"
                    onclick="History.captureShare('${collType}','${item.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              캡처·공유
            </button>
            <button class="card-action-btn card-action-delete"
                    onclick="History.deleteItem('${collType}','${item.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              기록 삭제
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ── 안전제안 상세보기 (이력조회에서 호출) ─────────────────────
  async _openProposal(id) {
    try {
      const apiBase = window.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/proposals`);
      if (!res.ok) throw new Error('server error');
      const data = await res.json();
      ProposalsView._proposals = data.proposals || [];
      ProposalsView.showDetail(String(id));
    } catch(e) {
      App.showToast('제안 내용을 불러올 수 없습니다');
      console.error('[History._openProposal]', e);
    }
  },

  // ── 유형별 체크 현황 바 ─────────────────────────────────────
  _renderCheckBar(item) {
    const t = item._collType;

    if (t === 'tbm') {
      const parts = [];
      const pc = (item.participants||[]).length;
      if (pc) parts.push(`<span class="hc-chip hc-pass">👥 ${pc}명 참석</span>`);
      if ((item.photos||[]).length) parts.push(`<span class="hc-chip hc-neutral">📷 ${item.photos.length}장</span>`);
      if (item.supervisorSignature) parts.push(`<span class="hc-chip hc-pass">✅ 감독자 서명</span>`);
      else                          parts.push(`<span class="hc-chip hc-none">⬜ 서명 없음</span>`);
      return parts.join('');
    }

    if (t === 'risk') {
      const items  = item.items || [];
      const high   = items.filter(i => i.riskLevel === '상').length;
      const mid    = items.filter(i => i.riskLevel === '중').length;
      const parts  = [`<span class="hc-chip hc-neutral">📋 ${items.length}건</span>`];
      if (high) parts.push(`<span class="hc-chip hc-fail">🔴 즉시개선 ${high}</span>`);
      if (mid)  parts.push(`<span class="hc-chip hc-warn">🟡 개선필요 ${mid}</span>`);
      // 개선 상태 뱃지
      if (item.improveStatus === '완료') {
        parts.push(`<span class="hc-chip hc-pass">✅ 개선완료</span>`);
      } else if (item.improveStatus === '지연') {
        parts.push(`<span class="hc-chip hc-fail">⚠️ 지연</span>`);
      } else if (item.improveStatus === '진행중') {
        parts.push(`<span class="hc-chip hc-warn">🔄 개선중</span>`);
      } else if (item.improveStatus === '완료예정') {
        parts.push(`<span class="hc-chip hc-neutral">📅 완료예정</span>`);
      }
      return parts.join('');
    }

    if (t === 'checklist') {
      const res       = Object.values(item.results || {});
      const pass      = res.filter(v => v === 'pass').length;
      const fail      = res.filter(v => v === 'fail').length;
      const na        = res.filter(v => v === 'na').length;
      const unchecked = res.filter(v => !v || v === 'unchecked').length;
      const parts  = [];
      if (pass) parts.push(`<span class="hc-chip hc-pass">✅ 양호 ${pass}</span>`);
      if (fail) parts.push(`<span class="hc-chip hc-fail">❌ 불량 ${fail}</span>`);
      if (na)   parts.push(`<span class="hc-chip hc-none">— 해당없음 ${na}</span>`);
      if (!pass && !fail && !na) {
        // 저장된 항목이 있으나 모두 미선택인 경우 총 항목 수 표시
        const total = res.length || (() => {
          const tmpl = (typeof Checklist !== 'undefined') && item.typeCode && Checklist.templates[item.typeCode];
          if (!tmpl) return 0;
          return Object.values(tmpl.categories).reduce((s, arr) => s + arr.length, 0);
        })();
        if (total > 0) parts.push(`<span class="hc-chip hc-neutral">📋 총 ${total}건</span>`);
        else           parts.push(`<span class="hc-chip hc-none">점검항목 없음</span>`);
      }
      if ((item.photos||[]).length) parts.push(`<span class="hc-chip hc-neutral">📷 ${item.photos.length}장</span>`);
      return parts.join('');
    }

    if (t === 'workplan') {
      const parts = [];
      if (item.supervisorSignature) parts.push(`<span class="hc-chip hc-pass">✅ 책임자 서명</span>`);
      else                          parts.push(`<span class="hc-chip hc-none">⬜ 서명 없음</span>`);
      if (item.tbmPhoto) parts.push(`<span class="hc-chip hc-neutral">📷 TBM사진</span>`);
      return parts.join('');
    }

    if (t === 'ptw') {
      const res  = Object.values(item.checkResults || {});
      const pass = res.filter(v => v === 'pass').length;
      const fail = res.filter(v => v === 'fail').length;
      const na   = res.filter(v => v === 'na').length;
      const parts = [];
      if (pass) parts.push(`<span class="hc-chip hc-pass">✅ 적합 ${pass}</span>`);
      if (fail) parts.push(`<span class="hc-chip hc-fail">❌ 부적합 ${fail}</span>`);
      if (na)   parts.push(`<span class="hc-chip hc-none">— 해당없음 ${na}</span>`);
      if (!res.length) parts.push(`<span class="hc-chip hc-none">체크 없음</span>`);
      return parts.join('');
    }

    if (t === 'accident') {
      const parts = [];
      if ((item.photos||[]).length) parts.push(`<span class="hc-chip hc-neutral">📷 ${item.photos.length}장</span>`);
      if (item.injuredName)         parts.push(`<span class="hc-chip hc-fail">🏥 부상자 있음</span>`);
      if (item.reporterSignature)   parts.push(`<span class="hc-chip hc-pass">✅ 서명완료</span>`);
      if (!parts.length)            parts.push(`<span class="hc-chip hc-none">서명 없음</span>`);
      return parts.join('');
    }

    return '';
  },

  // ── 개별 항목 공유 (사진 포함) ───────────────────────────
  async shareItem(collType, id) {
    const item = this._results.find(r => r.id === id && r._collType === collType);
    if (!item) { App.showToast('항목을 찾을 수 없습니다.'); return; }

    const text   = App._detailToText(collType, item);
    const title  = App._detailTitle(collType, item);
    const photos = await App._extractPhotosForShare(collType, item);   // 사진 File[] 비동기 추출

    await App._doShare({ title, text, photos });
  },

  // ── 수정 ──────────────────────────────────────────────────
  editItem(collType, id) {
    if (collType === 'proposal') {
      this._openProposal(id);
    } else {
      App.showDetail(collType, id);
    }
  },

  // ── 캡처·공유 ──────────────────────────────────────────────
  async captureShare(collType, id) {
    const cardEl = document.getElementById(`hc-${collType}-${id}`);
    if (!cardEl) { App.showToast('카드를 찾을 수 없습니다.'); return; }
    App.showToast('이미지 생성 중...');
    try {
      const canvas = await html2canvas(cardEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      canvas.toBlob(async (blob) => {
        if (!blob) { App.showToast('이미지 생성 실패'); return; }
        const file = new File([blob], 'safeon-record.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'SafeOn 기록' });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'safeon-record.png'; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          App.showToast('이미지를 저장했습니다.');
        }
      }, 'image/png');
    } catch (e) {
      console.error('[captureShare]', e);
      App.showToast('캡처 중 오류가 발생했습니다.');
    }
  },

  // ── 인쇄·PDF ──────────────────────────────────────────────
  printItem(collType, id) {
    const item = this._results.find(r => r.id === id && r._collType === collType);
    if (!item) { App.showToast('항목을 찾을 수 없습니다.'); return; }
    const typeLabels = { tbm:'TBM', risk:'위험성평가', checklist:'안전점검', workplan:'작업계획서', ptw:'작업허가서', nearmiss:'아차사고', accident:'사고보고서', proposal:'안전제안' };
    const info = this._getItemInfo(item);
    const dType = (collType === 'accident' && item.accidentType === 'nearmiss') ? 'nearmiss' : collType;
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
      <div style="font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:13px;color:#202124;padding:24px;max-width:600px;margin:0 auto">
        <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #1a73e8;padding-bottom:12px;margin-bottom:20px">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#1a73e8,#0d47a1);border-radius:9px;display:flex;align-items:center;justify-content:center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#0d47a1">SAMHWA SafeOn</div>
            <div style="font-size:11px;color:#5f6368">${typeLabels[dType] || dType} 기록</div>
          </div>
          <div style="margin-left:auto;font-size:11px;color:#5f6368;text-align:right">
            출력: ${new Date().toLocaleString('ko-KR')}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:8px 12px;font-weight:700;background:#f8f9fa;width:100px;border:1px solid #e0e0e0">구분</td><td style="padding:8px 12px;border:1px solid #e0e0e0">${typeLabels[dType] || dType}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:700;background:#f8f9fa;border:1px solid #e0e0e0">일자</td><td style="padding:8px 12px;border:1px solid #e0e0e0">${App.formatDate(item.date)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:700;background:#f8f9fa;border:1px solid #e0e0e0">제목</td><td style="padding:8px 12px;border:1px solid #e0e0e0">${App.escapeHtml(info.title)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:700;background:#f8f9fa;border:1px solid #e0e0e0">세부내용</td><td style="padding:8px 12px;border:1px solid #e0e0e0">${App.escapeHtml(info.sub)}</td></tr>
          ${item.status ? `<tr><td style="padding:8px 12px;font-weight:700;background:#f8f9fa;border:1px solid #e0e0e0">상태</td><td style="padding:8px 12px;border:1px solid #e0e0e0">${this._statusText(item.status)}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;text-align:right;font-size:10px;color:#9aa0a6;border-top:1px solid #e8eaed;padding-top:8px">
          SAMHWA SafeOn · 현장 안전보건 관리 시스템
        </div>
      </div>`;
    App._setPrintOrientation(false);
    App._applyPrintScale(printArea, false);
    setTimeout(() => {
      window.print();
      setTimeout(() => { printArea.innerHTML = ''; printArea.style.cssText = ''; }, 1000);
    }, 150);
  },

  // ── 기록 삭제 ──────────────────────────────────────────────
  async deleteItem(collType, id) {
    const typeLabels = { tbm:'TBM', risk:'위험성평가', checklist:'안전점검', workplan:'작업계획서', ptw:'작업허가서', nearmiss:'아차사고', accident:'사고보고서', proposal:'안전제안' };
    const ok = await App.confirm(
      `<b>${typeLabels[collType] || '기록'}</b> 1건을 영구 삭제합니다.<br>삭제된 데이터는 복구할 수 없습니다.`,
      { type: 'delete', title: '기록을 삭제하시겠습니까?' }
    );
    if (!ok) return;
    try {
      if (collType === 'proposal') {
        const apiBase = window.API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/proposals/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('서버 오류');
      } else {
        await collections[collType].doc(id).delete();
      }
      this._results = this._results.filter(r => !(r.id === id && r._collType === collType));
      App.showToast('삭제되었습니다.');
      this._renderPage(this._page);
    } catch (e) {
      console.error('[deleteItem]', e);
      App.showToast('삭제 중 오류가 발생했습니다.');
    }
  },

  // ── 카드 사진 추출 ─────────────────────────────────────────
  _getCardPhotos(item) {
    if (item._collType === 'proposal') return [];
    if (item.photos && item.photos.length) return item.photos;
    if (item.tbmPhoto) return [item.tbmPhoto];
    return [];
  },

  _renderPhotoStrip(photos, collType, id) {
    const MAX   = 3;
    const shown = photos.slice(0, MAX);
    const extra = photos.length - MAX;
    const thumbs = shown.map((_, i) => {
      const isLast = i === MAX - 1 && extra > 0;
      const click  = isLast
        ? `event.stopPropagation();App.showDetail('${collType}','${id}')`
        : `event.stopPropagation();History._viewCardPhoto('${collType}','${id}',${i})`;
      return `<div class="hc-photo-thumb" onclick="${click}">
        <img src="${photos[i]}" alt="사진${i + 1}" loading="lazy">
        ${isLast ? `<div class="hc-photo-more">+${extra + 1}</div>` : ''}
      </div>`;
    });
    return `<div class="hc-photo-strip" onclick="event.stopPropagation()">${thumbs.join('')}</div>`;
  },

  _viewCardPhoto(collType, id, idx) {
    const item = this._results.find(r => r._collType === collType && r.id === id);
    if (!item) return;
    const photos = this._getCardPhotos(item);
    if (photos[idx]) App._viewPhoto(photos[idx]);
  },

  renderStatusBadge(status) {
    const map = {
      submitted: { text:'신청',   color:'var(--primary)' },
      reviewing: { text:'검토중', color:'var(--warning)' },
      approved:  { text:'승인',   color:'var(--success)' },
      rejected:  { text:'반려',   color:'var(--danger)'  }
    };
    const s = map[status];
    if (!s) return '';
    return `<span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:8px;background:${s.color}20;color:${s.color}">${s.text}</span>`;
  }
};
