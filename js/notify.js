// 알림 패널 — 배지, 개별 닫기, 전체 지우기, 5분 자동 갱신
const Notify = {
  _alerts:      [],
  _panelOpen:   false,
  _dismissedIds: new Set(),

  async init() {
    if (App.guestMode) return;
    this._dismissedIds = this._loadDismissedIds();
    await this.refresh();
    document.addEventListener('click', e => {
      if (!this._panelOpen) return;
      const panel = document.getElementById('notify-panel');
      const btn   = document.getElementById('btn-notify');
      if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
        this._closePanel();
      }
    });
  },

  // ── 닫기 처리 ────────────────────────────────────────────────
  dismiss(key) {
    this._dismissedIds.add(key);
    this._saveDismissedIds();
    this._updateBadge();
    if (this._panelOpen) this._renderItems();
  },

  clearAll() {
    this._alerts.forEach(a => this._dismissedIds.add(this._getAlertKey(a)));
    this._saveDismissedIds();
    this._updateBadge();
    if (this._panelOpen) this._renderItems();
  },

  _loadDismissedIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem('safeon.dismissedAlerts') || '[]'));
    } catch (e) { return new Set(); }
  },

  _saveDismissedIds() {
    try {
      localStorage.setItem('safeon.dismissedAlerts', JSON.stringify([...this._dismissedIds].slice(-500)));
    } catch (e) {}
  },

  // ── 데이터 조회 ──────────────────────────────────────────────
  async refresh() {
    this._alerts = [];
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        if (data.alerts?.length) {
          this._alerts = data.alerts;
        } else {
          throw new Error('empty');
        }
      } else {
        throw new Error(res.status);
      }
    } catch (e) {
      await this._refreshFromFirestore();
    }
    this._sortAlerts();
    this._updateBadge();
    if (this._panelOpen) this._renderItems();
  },

  async _refreshFromFirestore() {
    if (App.guestMode) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // PTW 쿼리 — 실패해도 Risk 쿼리 계속 진행
    try {
      const ptwSnap = await collections.ptw.orderBy('date', 'desc').limit(100).get();
      ptwSnap.forEach(doc => {
        const d = { id: doc.id, ...doc.data() };
        if (d.status === 'rejected') return;
        if (d.status === 'submitted') {
          this._add({ urgency: 'low', type: 'ptw-pending', icon: '📋', collType: 'ptw', docId: d.id,
            title: d.workName || '작업허가서', sub: `${d.company || ''} · 결재 대기 중`.replace(/^ · /, ''), date: d.date || '' });
        }
        if (d.periodEnd) {
          const endStr = d.periodEnd.split('T')[0];
          const diffDay = Math.round((new Date(endStr) - today) / 86400000);
          if (diffDay >= 0 && diffDay <= 3) {
            this._add({ urgency: diffDay <= 1 ? 'high' : 'mid', type: 'ptw-expire', icon: '⏰', collType: 'ptw', docId: d.id,
              title: d.workName || '작업허가서', sub: `${d.company ? d.company + ' · ' : ''}만료 ${diffDay === 0 ? '오늘' : 'D-' + diffDay}`, date: endStr });
          }
        }
      });
    } catch (e) {
      console.warn('[Notify] PTW 쿼리 오류:', e);
    }

    // Risk 쿼리 — in 연산자 대신 == 두 번으로 분리 (복합 인덱스 불필요)
    try {
      const [delayedSnap, inProgressSnap] = await Promise.all([
        collections.risk.where('improveStatus', '==', '지연').limit(100).get(),
        collections.risk.where('improveStatus', '==', '진행중').limit(100).get()
      ]);
      const processRisk = doc => {
        const d = { id: doc.id, ...doc.data() };
        if (d.improveStatus === '지연') {
          this._add({ urgency: 'high', type: 'risk-overdue', icon: '🔴', collType: 'risk', docId: d.id,
            title: d.workName || '위험성평가', sub: `개선 지연 · 예정일 ${d.planDate || '미설정'}`, date: d.planDate || d.date || '' });
        } else if (d.improveStatus === '진행중' && d.planDate) {
          const diffDay = Math.round((new Date(d.planDate) - today) / 86400000);
          if (diffDay >= 0 && diffDay <= 3) {
            this._add({ urgency: 'mid', type: 'risk-soon', icon: '⚠️', collType: 'risk', docId: d.id,
              title: d.workName || '위험성평가', sub: `개선 임박 D-${diffDay} · ${d.planDate}`, date: d.planDate });
          }
        }
      };
      delayedSnap.forEach(processRisk);
      inProgressSnap.forEach(processRisk);
    } catch (e) {
      console.warn('[Notify] Risk 쿼리 오류:', e);
    }
  },

  _add(alert) { this._alerts.push(alert); },

  _sortAlerts() {
    const rank = { high: 0, mid: 1, low: 2 };
    this._alerts.sort((a, b) => (rank[a.urgency] - rank[b.urgency]) || (b.date || '').localeCompare(a.date || ''));
  },

  _getAlertKey(alert) { return `${alert.type}|${alert.collType}|${alert.docId}`; },

  // ── 배지 ─────────────────────────────────────────────────────
  _updateBadge() {
    const badge = document.getElementById('notify-badge');
    if (!badge) return;
    const count = this._alerts.filter(a => !this._dismissedIds.has(this._getAlertKey(a))).length;
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.classList.toggle('hidden', count === 0);
    const btn = document.getElementById('btn-notify');
    if (btn && count > 0) {
      btn.classList.remove('notify-shake');
      void btn.offsetWidth;
      btn.classList.add('notify-shake');
    }
  },

  // ── 패널 토글 ────────────────────────────────────────────────
  toggle() {
    if (this._panelOpen) this._closePanel();
    else                 this._openPanel();
  },

  _openPanel() {
    this._panelOpen = true;
    this._renderPanel();
    const panel = document.getElementById('notify-panel');
    if (panel) {
      panel.classList.remove('hidden');
      requestAnimationFrame(() => panel.classList.add('notify-panel-visible'));
    }
    this.refresh();
  },

  _closePanel() {
    this._panelOpen = false;
    const panel = document.getElementById('notify-panel');
    if (!panel) return;
    panel.classList.remove('notify-panel-visible');
    setTimeout(() => panel.classList.add('hidden'), 220);
  },

  // ── 패널 렌더 ────────────────────────────────────────────────
  _renderPanel() {
    const panel = document.getElementById('notify-panel');
    if (!panel) return;
    const activeCount = this._alerts.filter(a => !this._dismissedIds.has(this._getAlertKey(a))).length;
    panel.innerHTML = `
      <div class="notify-panel-header">
        <span class="notify-panel-title">알림</span>
        <span class="notify-panel-count">${activeCount}건</span>
        <button class="notify-panel-close" onclick="Notify._closePanel()" aria-label="닫기">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="notify-items" class="notify-items"></div>
      <div class="notify-panel-footer">
        <button class="notify-refresh-btn" onclick="Notify.refresh()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          새로고침
        </button>
        ${activeCount > 0 ? `<button class="notify-clear-btn" onclick="Notify.clearAll()">전체 지우기</button>` : ''}
      </div>`;
    this._renderItems();
  },

  _renderItems() {
    const container = document.getElementById('notify-items');
    if (!container) return;
    const visible = this._alerts.filter(a => !this._dismissedIds.has(this._getAlertKey(a)));
    if (!visible.length) {
      container.innerHTML = `
        <div class="notify-empty">
          <div class="notify-empty-icon">✅</div>
          <div class="notify-empty-title">알림 없음</div>
          <div class="notify-empty-sub">처리가 필요한 항목이 없습니다</div>
        </div>`;
      return;
    }
    const URGENCY_LABEL = { high: '🔴 즉시 처리', mid: '🟡 주의 필요', low: '📋 확인 필요' };
    const groups = {};
    visible.forEach(a => { (groups[a.urgency] = groups[a.urgency] || []).push(a); });
    container.innerHTML = ['high', 'mid', 'low']
      .filter(u => groups[u]?.length)
      .map(u => `
        <div class="notify-group-label">${URGENCY_LABEL[u]}</div>
        ${groups[u].map(a => {
          const key = App.escapeHtml(this._getAlertKey(a));
          return `
          <div class="notify-item notify-urgency-${a.urgency}" data-coll-type="${App.escapeHtml(a.collType)}" data-doc-id="${App.escapeHtml(a.docId)}">
            <span class="notify-item-icon">${a.icon}</span>
            <div class="notify-item-body">
              <div class="notify-item-title">${App.escapeHtml(a.title)}</div>
              <div class="notify-item-sub">${App.escapeHtml(a.sub)}</div>
            </div>
            <button class="notify-item-dismiss" data-key="${key}" aria-label="닫기">×</button>
          </div>`;
        }).join('')}
      `).join('');
    container.querySelectorAll('.notify-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.notify-item-dismiss')) return;
        this._goto(item.dataset.collType, item.dataset.docId);
      });
    });
    container.querySelectorAll('.notify-item-dismiss').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.dismiss(btn.dataset.key);
      });
    });
  },

  // ── 이동 ─────────────────────────────────────────────────────
  _goto(collType, docId) {
    if (!collType || !docId) return;
    this._closePanel();
    setTimeout(() => App.showDetail(collType, docId), 230);
  }
};
