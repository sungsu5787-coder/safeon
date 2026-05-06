// ===== ProposalsView — 제안 목록·현황 관리 =====
const ProposalsView = {
  _proposals: [],
  _filter: '전체',

  onPageShow() {
    this.load();
  },

  async load() {
    const listEl = document.getElementById('proposals-list');
    if (listEl) listEl.innerHTML = '<div class="proposals-loading">불러오는 중...</div>';
    try {
      const apiBase = window.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/proposals`);
      if (!res.ok) throw new Error('server error');
      const data = await res.json();
      this._proposals = data.proposals || [];
      this._render();
    } catch {
      if (listEl) listEl.innerHTML = '<div class="proposals-empty">데이터를 불러올 수 없습니다.<br>서버 연결을 확인하세요.</div>';
    }
  },

  setFilter(filter) {
    this._filter = filter;
    document.querySelectorAll('.proposals-filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    this._render();
  },

  _filtered() {
    if (this._filter === '전체') return this._proposals;
    return this._proposals.filter(p => (p.status || '접수') === this._filter);
  },

  _render() {
    // 탭 배지 업데이트
    ['전체', '접수', '검토중', '완료', '반려'].forEach(f => {
      const cnt = f === '전체'
        ? this._proposals.length
        : this._proposals.filter(p => (p.status || '접수') === f).length;
      const badge = document.querySelector(`.proposals-filter-tab[data-filter="${f}"] .tab-badge`);
      if (badge) badge.textContent = cnt;
    });

    const listEl = document.getElementById('proposals-list');
    if (!listEl) return;
    const items = this._filtered();
    if (!items.length) {
      listEl.innerHTML = '<div class="proposals-empty">해당 제안이 없습니다.</div>';
      return;
    }
    listEl.innerHTML = items.map(p => this._cardHtml(p)).join('');
  },

  _statusColor(status) {
    return { '접수': '#64b5f6', '검토중': '#ffb74d', '완료': '#81c784', '반려': '#e57373' }[status] || '#64b5f6';
  },

  _cardHtml(p) {
    const status = p.status || '접수';
    const date = p.createdAt
      ? new Date(p.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '';
    const preview = (p.suggestion || '').length > 60
      ? p.suggestion.slice(0, 60) + '…'
      : (p.suggestion || '');
    return `
      <div class="proposal-card" onclick="ProposalsView.showDetail('${p.id}')">
        <div class="proposal-card-header">
          <span class="proposal-card-who">${App.escapeHtml(p.affiliation)} · ${App.escapeHtml(p.department)} · ${App.escapeHtml(p.name)}</span>
          <span class="proposal-status-badge" style="background:${this._statusColor(status)}">${status}</span>
        </div>
        <div class="proposal-card-body">${App.escapeHtml(preview)}</div>
        <div class="proposal-card-footer">
          <span>${date}</span>
          <div style="display:flex;gap:6px">
            ${p.note ? '<span class="proposal-has-photo">📝 비고</span>' : ''}
            ${p.hasImage ? '<span class="proposal-has-photo">📷 사진</span>' : ''}
          </div>
        </div>
      </div>`;
  },

  showDetail(id) {
    const p = this._proposals.find(x => x.id === id);
    if (!p) return;
    const modal = document.getElementById('proposal-detail-modal');
    const content = document.getElementById('proposal-detail-content');
    if (!modal || !content) return;

    const status = p.status || '접수';
    const date = p.createdAt ? new Date(p.createdAt).toLocaleString('ko-KR') : '';
    const apiBase = window.API_BASE_URL || '';

    content.innerHTML = `
      <div class="proposal-detail-meta">
        <div><strong>소속</strong>${App.escapeHtml(p.affiliation)}</div>
        <div><strong>부서</strong>${App.escapeHtml(p.department)}</div>
        <div><strong>이름</strong>${App.escapeHtml(p.name)}</div>
        <div><strong>연락처</strong>${App.escapeHtml(p.phone)}</div>
        <div><strong>제출일</strong>${date}</div>
      </div>
      <div class="proposal-detail-suggestion">
        <div class="proposal-detail-label">제안 내용</div>
        <p>${App.escapeHtml(p.suggestion || '').replace(/\n/g, '<br>')}</p>
      </div>
      ${p.hasImage ? `<div class="proposal-detail-photo"><img src="${apiBase}${p.imageUrl}" alt="첨부 사진" onclick="App._viewPhoto(this.src)" loading="lazy"></div>` : ''}
      <div class="proposal-detail-status">
        <div class="proposal-detail-label">처리 상태 변경</div>
        <div class="proposal-status-btns">
          ${['접수', '검토중', '완료', '반려'].map(s => `
            <button class="proposal-status-btn${status === s ? ' active' : ''}"
                    style="${status === s ? `background:${this._statusColor(s)};color:#fff;border-color:${this._statusColor(s)}` : ''}"
                    onclick="ProposalsView.setStatus('${p.id}','${s}')">${s}</button>
          `).join('')}
        </div>
      </div>
      <div class="proposal-detail-note-section">
        <div class="proposal-detail-label">비고</div>
        <textarea id="proposal-note-input" class="proposal-note-textarea" rows="3"
          placeholder="처리 상태 관련 내용을 입력하세요 (담당자 의견, 조치 결과 등)">${App.escapeHtml(p.note || '')}</textarea>
        <button class="proposal-note-save-btn" onclick="ProposalsView.saveNote('${p.id}')">비고 저장</button>
      </div>`;

    modal.classList.remove('hidden');
  },

  closeDetail() {
    const modal = document.getElementById('proposal-detail-modal');
    if (modal) modal.classList.add('hidden');
  },

  async setStatus(id, status) {
    try {
      const apiBase = window.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/proposals/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('fail');
      const p = this._proposals.find(x => x.id === id);
      if (p) p.status = status;
      App.showToast(`✅ "${status}"(으)로 변경되었습니다.`);
      this.closeDetail();
      this._render();
    } catch {
      App.showToast('상태 변경에 실패했습니다.');
    }
  },

  async saveNote(id) {
    const textarea = document.getElementById('proposal-note-input');
    if (!textarea) return;
    const note = textarea.value.trim();
    try {
      const apiBase = window.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/proposals/${id}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (!res.ok) throw new Error('fail');
      const p = this._proposals.find(x => x.id === id);
      if (p) p.note = note;
      App.showToast('✅ 비고가 저장되었습니다.');
      this._render();
    } catch {
      App.showToast('비고 저장에 실패했습니다.');
    }
  }
};
