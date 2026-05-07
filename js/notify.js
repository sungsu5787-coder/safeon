// ===== Notify Module =====
const Notify = {
  _alerts:    [],
  _panelOpen: false,
  _dismissedIds: new Set(),
  _alimtalkConfig: {
    enabled: false,
    recipientPhone: '',
    templateId: '',
    apiEndpoint: '/api/send-alimtalk',
    configEndpoint: '/api/notify-config',
    sendOnTypes: ['ptw-expire', 'risk-overdue', 'risk-soon', 'ptw-pending']
  },

  async init() {
    if (App.guestMode) return;
    this._dismissedIds = this._loadDismissedIds();
    await this._loadAlimtalkConfig();
    await this.refresh();

    // 5분마다 자동 갱신
    setInterval(() => this.refresh(), 5 * 60 * 1000);

    document.addEventListener('click', e => {
      if (!this._panelOpen) return;
      const panel = document.getElementById('notify-panel');
      const btn   = document.getElementById('btn-notify');
      if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
        this._closePanel();
      }
    });
  },

  // ── 읽음/닫기 처리 ───────────────────────────────────────────
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
      const arr = [...this._dismissedIds].slice(-500);
      localStorage.setItem('safeon.dismissedAlerts', JSON.stringify(arr));
    } catch (e) {}
  },

  // ── 데이터 조회 & 알림 목록 갱신 ────────────────────────────
  async refresh() {
    this._alerts = [];

    try {
      // 서버 API에서 알림 데이터 조회 시도
      const response = await fetch('/api/alerts', { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        if (data.alerts && data.alerts.length > 0) {
          this._alerts = data.alerts;
          console.log('[Notify] 서버 API에서 알림 로드:', this._alerts.length);
        } else {
          // 서버에서 빈 배열 반환 → 클라이언트 폴백
          throw new Error('Server returned empty alerts, using client fallback');
        }
      } else {
        throw new Error(`Alert API 오류: ${response.status}`);
      }
    } catch (e) {
      console.log('[Notify] 서버 API 실패, Firestore 직접 접근 시도:', e.message);
      // 폴백: 클라이언트에서 직접 조회
      await this._refreshFromFirestore();
    }

    this._sortAlerts();
    this._updateBadge();
    await this._sendAlimtalkForNewAlerts();
    if (this._panelOpen) this._renderItems();
  },

  async _refreshFromFirestore() {
    if (App.guestMode) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d3 = new Date(today);
    d3.setDate(d3.getDate() + 3);
    const d3Str = d3.toISOString().split('T')[0];

    try {
      const [ptwSnap, riskSnap] = await Promise.all([
        collections.ptw
          .orderBy('date', 'desc')
          .limit(100)
          .get(),
        collections.risk
          .where('improveStatus', 'in', ['지연', '진행중'])
          .limit(100)
          .get()
      ]);

      // ── PTW 알림 ──────────────────────────────────────────
      ptwSnap.forEach(doc => {
        const d = { id: doc.id, ...doc.data() };
        if (d.status === 'rejected') return;

        // 결재 대기
        if (d.status === 'submitted') {
          this._add({
            urgency: 'low',
            type: 'ptw-pending',
            icon: '📋',
            collType: 'ptw',
            docId: d.id,
            title: d.workName || '작업허가서',
            sub: `${d.company || ''} · 결재 대기 중`.replace(/^ · /, ''),
            date: d.date || ''
          });
        }

        // 만료 임박: periodEnd 에서 날짜 부분만 추출
        if (d.periodEnd) {
          const endStr = d.periodEnd.split('T')[0];
          const endDay = new Date(endStr);
          endDay.setHours(0, 0, 0, 0);
          const diffMs = endDay - today;
          const diffDay = Math.round(diffMs / 86400000);

          if (diffDay >= 0 && diffDay <= 3) {
            const label = diffDay === 0 ? '오늘 만료' : `D-${diffDay}`;
            this._add({
              urgency: diffDay <= 1 ? 'high' : 'mid',
              type: 'ptw-expire',
              icon: '⏰',
              collType: 'ptw',
              docId: d.id,
              title: d.workName || '작업허가서',
              sub: `${d.company ? d.company + ' · ' : ''}만료 ${label}`,
              date: endStr
            });
          }
        }
      });

      // ── 위험성평가 알림 ────────────────────────────────────
      riskSnap.forEach(doc => {
        const d = { id: doc.id, ...doc.data() };

        if (d.improveStatus === '지연') {
          this._add({
            urgency: 'high',
            type: 'risk-overdue',
            icon: '🔴',
            collType: 'risk',
            docId: d.id,
            title: d.workName || '위험성평가',
            sub: `개선 지연 · 예정일 ${d.planDate || '미설정'}`,
            date: d.planDate || d.date || ''
          });
        } else if (d.improveStatus === '진행중' && d.planDate) {
          const planDay = new Date(d.planDate);
          planDay.setHours(0, 0, 0, 0);
          const diffDay = Math.round((planDay - today) / 86400000);
          if (diffDay >= 0 && diffDay <= 3) {
            this._add({
              urgency: 'mid',
              type: 'risk-soon',
              icon: '⚠️',
              collType: 'risk',
              docId: d.id,
              title: d.workName || '위험성평가',
              sub: `개선 임박 D-${diffDay} · ${d.planDate}`,
              date: d.planDate
            });
          }
        }
      });
    } catch (e) {
      console.warn('[Notify] Firestore fallback 오류:', e);
    }
  },

  async _sendAlimtalkForNewAlerts() {
    if (!this._alimtalkConfig.enabled) return;
    const sentIds = this._loadSentAlertIds();
    const newAlerts = this._alerts.filter(alert =>
      this._alimtalkConfig.sendOnTypes.includes(alert.type) &&
      !sentIds.includes(this._getAlertKey(alert))
    );

    for (const alert of newAlerts) {
      const ok = await this._sendAlimtalk(alert);
      if (ok) {
        sentIds.push(this._getAlertKey(alert));
      }
    }

    this._saveSentAlertIds(sentIds);
  },

  async _loadAlimtalkConfig() {
    try {
      const response = await fetch(this._alimtalkConfig.configEndpoint);
      if (!response.ok) return;
      const config = await response.json();
      if (config.enabled) {
        this._alimtalkConfig = {
          ...this._alimtalkConfig,
          enabled: config.enabled,
          recipientPhone: config.recipientPhone,
          templateId: config.templateId,
          apiEndpoint: config.apiEndpoint,
          sendOnTypes: config.sendOnTypes
        };
      }
    } catch (error) {
      console.warn('[Notify] loadAlimtalkConfig failed', error);
    }
  },

  _getAlertKey(alert) {
    return `${alert.type}|${alert.collType}|${alert.docId}`;
  },

  _loadSentAlertIds() {
    try {
      return JSON.parse(localStorage.getItem('safeon.sentAlimtalkIds') || '[]');
    } catch (e) {
      return [];
    }
  },

  _saveSentAlertIds(ids) {
    try {
      localStorage.setItem('safeon.sentAlimtalkIds', JSON.stringify(ids.slice(-200)));
    } catch (e) {
      console.warn('[Notify] localStorage save failed', e);
    }
  },

  async _sendAlimtalk(alert) {
    const config = this._alimtalkConfig;
    if (!config.recipientPhone || !config.templateId) {
      console.warn('[Notify] 알림톡 설정이 올바르지 않습니다');
      return false;
    }

    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: config.recipientPhone,
          templateId: config.templateId,
          message: {
            title: alert.title,
            body: alert.sub
          }
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn('[Notify] sendAlimtalk failed', response.status, text);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('[Notify] sendAlimtalk error', error);
      return false;
    }
  },

  _add(alert) { this._alerts.push(alert); },

  _sortAlerts() {
    const rank = { high: 0, mid: 1, low: 2 };
    this._alerts.sort((a, b) => {
      const r = rank[a.urgency] - rank[b.urgency];
      if (r !== 0) return r;
      return (b.date || '').localeCompare(a.date || '');
    });
  },

  // ── 배지 갱신 ────────────────────────────────────────────────
  _updateBadge() {
    const badge = document.getElementById('notify-badge');
    if (!badge) return;
    const count = this._alerts.filter(a => !this._dismissedIds.has(this._getAlertKey(a))).length;
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.classList.toggle('hidden', count === 0);

    // 벨 버튼 흔들기 애니메이션 (새 알림 있을 때)
    const btn = document.getElementById('btn-notify');
    if (btn && count > 0) {
      btn.classList.remove('notify-shake');
      void btn.offsetWidth;   // reflow
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
    // 패널 열 때마다 최신 알림 갱신
    this.refresh();
  },

  _closePanel() {
    this._panelOpen = false;
    const panel = document.getElementById('notify-panel');
    if (!panel) return;
    panel.classList.remove('notify-panel-visible');
    setTimeout(() => panel.classList.add('hidden'), 220);
  },

  // ── 패널 렌더 (껍데기) ───────────────────────────────────────
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

  // ── 알림 항목 목록 렌더 ──────────────────────────────────────
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
    visible.forEach(a => {
      (groups[a.urgency] = groups[a.urgency] || []).push(a);
    });

    container.innerHTML = ['high','mid','low']
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

    if (!collType || !docId) {
      console.warn('[Notify] 잘못된 알림 이동 정보', collType, docId);
      return;
    }
    this._closePanel();
    setTimeout(() => App.showDetail(collType, docId), 230);
  }
};
