// 알림 패널 — 배지, 개별 닫기, 전체 지우기, 멜로디 알림
const Notify = {
  _alerts:      [],
  _panelOpen:   false,
  _dismissedIds: new Set(),
  _audioCtx:    null,

  // ── 멜로디 ───────────────────────────────────────────────────
  // type: 'done' | 'high' | 'mid' | 'low'
  playMelody(type = 'low') {
    if (localStorage.getItem('safeon.soundOff') === '1') return;
    try {
      if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const MELODIES = {
        done: [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.13 }, { f: 783.99, t: 0.26 }, { f: 1046.50, t: 0.39 }],
        high: [{ f: 880, t: 0 }, { f: 440, t: 0.14 }, { f: 880, t: 0.28 }, { f: 440, t: 0.42 }],
        mid:  [{ f: 659.25, t: 0 }, { f: 523.25, t: 0.18 }],
        low:  [{ f: 523.25, t: 0 }],
      };
      (MELODIES[type] || MELODIES.low).forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = f;
        const s = ctx.currentTime + t;
        gain.gain.setValueAtTime(0.22, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.28);
        osc.start(s); osc.stop(s + 0.30);
      });
    } catch (e) {}
  },

  toggleSound() {
    const off = localStorage.getItem('safeon.soundOff') === '1';
    localStorage.setItem('safeon.soundOff', off ? '0' : '1');
    if (!off) {
      // 방금 켰으면 테스트 음 재생
      this.playMelody('low');
    }
    if (this._panelOpen) this._renderPanel();
  },

  _soundOff() { return localStorage.getItem('safeon.soundOff') === '1'; },

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

  // ── 완료 알림 ────────────────────────────────────────────────
  // 모듈 저장 직후 호출 → localStorage에 24시간 보관
  addCompletion({ icon, title, sub, collType, docId = '' }) {
    try {
      const key  = 'safeon.completions';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ icon, title, sub, collType, docId, savedAt: Date.now() });
      // 최근 50건만 보관
      localStorage.setItem(key, JSON.stringify(list.slice(-50)));
    } catch (e) {}
    this.playMelody('done');
    this.refresh();
  },

  _loadCompletions() {
    try {
      const TTL  = 24 * 60 * 60 * 1000; // 24시간
      const list = JSON.parse(localStorage.getItem('safeon.completions') || '[]');
      const now  = Date.now();
      return list
        .filter(c => now - c.savedAt < TTL)
        .map(c => ({ ...c, urgency: 'done', type: `done|${c.collType}|${c.docId}|${c.savedAt}`, date: '' }));
    } catch (e) { return []; }
  },

  // ── 데이터 조회 ──────────────────────────────────────────────
  async refresh() {
    this._alerts = [];
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      this._alerts = data.alerts || [];
    } catch (e) {
      await this._refreshFromFirestore();
    }
    // 완료 알림 병합 (Firestore 알림 앞에 표시)
    this._alerts = [...this._loadCompletions(), ...this._alerts];
    this._sortAlerts();
    this._updateBadge();
    if (this._panelOpen) this._renderItems();
  },

  async _refreshFromFirestore() {
    if (App.guestMode) return;
    // 익명 인증 완료 대기 (최대 3초)
    await new Promise(resolve => {
      const unsub = firebase.auth().onAuthStateChanged(user => { unsub(); resolve(user); });
      setTimeout(resolve, 3000);
    });
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

    const todayStr   = today.toISOString().split('T')[0];
    const weekAgo    = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // TBM 오늘 미실시 확인
    try {
      const tbmTodaySnap = await collections.tbm.where('date', '==', todayStr).limit(1).get();
      if (tbmTodaySnap.empty) {
        this._add({ urgency: 'low', type: 'tbm-missing', icon: '📣', collType: 'tbm', docId: '',
          title: 'TBM 미실시', sub: '오늘 TBM 기록이 없습니다', date: todayStr });
      }
    } catch (e) {
      console.warn('[Notify] TBM 쿼리 오류:', e);
    }

    // 안전점검 — 불량 항목 + 유형별 미실시 (단일 쿼리로 처리)
    try {
      const monthAgo    = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];
      const clSnap = await collections.checklist.where('date', '>=', monthAgoStr).limit(200).get();
      const doneToday = new Set(), doneWeek = new Set(), doneMonth = new Set();
      clSnap.forEach(doc => {
        const d = { id: doc.id, ...doc.data() };
        if (d.typeCode && d.date === todayStr)    doneToday.add(d.typeCode);
        if (d.typeCode && d.date >= weekAgoStr)   doneWeek.add(d.typeCode);
        if (d.typeCode)                            doneMonth.add(d.typeCode);
        const hasFail = d.results && Object.values(d.results).some(v => v === 'fail');
        if (hasFail && d.date >= weekAgoStr) {
          this._add({ urgency: 'mid', type: 'checklist-fail', icon: '❗', collType: 'checklist', docId: d.id,
            title: d.type || '안전점검', sub: `불량 항목 · ${d.location || d.date || ''}`.replace(/ · $/, ''), date: d.date || '' });
        }
      });
      const MISSING = [
        { code: 'daily',     label: '일일 안전점검', sub: '오늘 일일 안전점검 기록이 없습니다',    done: doneToday.has('daily') },
        { code: 'weekly',    label: '주간 안전점검', sub: '이번 주 주간 안전점검 기록이 없습니다',  done: doneWeek.has('weekly') },
        { code: 'special',   label: '특별 안전점검', sub: '이번 달 특별 안전점검 기록이 없습니다',  done: doneMonth.has('special') },
        { code: 'equipment', label: '장비 점검',     sub: '이번 달 장비 점검 기록이 없습니다',      done: doneMonth.has('equipment') },
        { code: 'fire',      label: '소방안전점검',  sub: '이번 달 소방안전점검 기록이 없습니다',   done: doneMonth.has('fire') },
      ];
      MISSING.forEach(({ code, label, sub, done }) => {
        if (!done) this._add({ urgency: 'low', type: `checklist-missing-${code}`, icon: '📋',
          collType: 'checklist', docId: '', title: `${label} 미실시`, sub, date: todayStr });
      });
    } catch (e) {
      console.warn('[Notify] 체크리스트 쿼리 오류:', e);
    }

    // 사고 — 최근 7일 내 산업재해·중대재해·안전사고
    try {
      const accSnap = await collections.accident.where('date', '>=', weekAgoStr).limit(50).get();
      accSnap.forEach(doc => {
        const d = { id: doc.id, ...doc.data() };
        const sub = `${d.location || ''} · ${d.date || ''}`.replace(/^ · | · $/, '');
        if (d.accidentType === 'industrial' || d.accidentType === 'serious') {
          this._add({ urgency: 'high', type: 'accident-serious', icon: '🚨', collType: 'accident', docId: d.id,
            title: d.accidentTypeLabel || '중대사고', sub, date: d.date || '' });
        } else if (d.accidentType === 'safety') {
          this._add({ urgency: 'mid', type: 'accident-safety', icon: '🩹', collType: 'accident', docId: d.id,
            title: '안전사고 발생', sub, date: d.date || '' });
        } else if (d.accidentType === 'nearmiss') {
          this._add({ urgency: 'low', type: 'accident-nearmiss', icon: '⚡', collType: 'accident', docId: d.id,
            title: '아차사고 발생', sub, date: d.date || '' });
        }
      });
    } catch (e) {
      console.warn('[Notify] 사고 쿼리 오류:', e);
    }
  },

  _add(alert) { this._alerts.push(alert); },

  _sortAlerts() {
    const rank = { done: -1, high: 0, mid: 1, low: 2 };
    this._alerts.sort((a, b) => (rank[a.urgency] ?? 2) - (rank[b.urgency] ?? 2) || (b.date || '').localeCompare(a.date || ''));
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
    // 미확인 알림 긴급도에 따라 멜로디 재생 (사용자 제스처 직후이므로 iOS도 허용)
    const unread = this._alerts.filter(a => !this._dismissedIds.has(this._getAlertKey(a)) && a.urgency !== 'done');
    if (unread.length) {
      const top = unread.find(a => a.urgency === 'high') ? 'high'
                : unread.find(a => a.urgency === 'mid')  ? 'mid' : 'low';
      this.playMelody(top);
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
        <div style="display:flex;align-items:center;gap:8px">
          <button class="notify-sound-btn" onclick="Notify.toggleSound()" title="${this._soundOff() ? '소리 켜기' : '소리 끄기'}">
            ${this._soundOff()
              ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
              : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`
            }
          </button>
          ${activeCount > 0 ? `<button class="notify-clear-btn" onclick="Notify.clearAll()">전체 지우기</button>` : ''}
        </div>
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
    const URGENCY_LABEL = { done: '✅ 완료', high: '🔴 즉시 처리', mid: '🟡 주의 필요', low: '📋 확인 필요' };
    const groups = {};
    visible.forEach(a => { (groups[a.urgency] = groups[a.urgency] || []).push(a); });
    container.innerHTML = ['done', 'high', 'mid', 'low']
      .filter(u => groups[u]?.length)
      .map(u => `
        <div class="notify-group-label">${URGENCY_LABEL[u]}</div>
        ${groups[u].map(a => {
          const key = this._getAlertKey(a);
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
    if (!collType) return;
    this._closePanel();
    setTimeout(() => {
      if (docId) App.showDetail(collType, docId);
      else App.navigateTo(collType);
    }, 230);
  }
};
