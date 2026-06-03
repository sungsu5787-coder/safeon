// 관리자 종합관리 페이지 — 로그인 게이트 및 통계 대시보드를 담당하는 모듈
const Admin = {
  TOKEN_KEY: 'safeon_admin_token',

  get token() { return sessionStorage.getItem(this.TOKEN_KEY) || ''; },
  set token(v) {
    if (v) sessionStorage.setItem(this.TOKEN_KEY, v);
    else sessionStorage.removeItem(this.TOKEN_KEY);
  },

  onPageShow() {
    if (this.token) this._showDashboard();
    else this._showLogin();
  },

  _showLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    const err = document.getElementById('admin-login-error');
    if (err) err.classList.add('hidden');
    const input = document.getElementById('admin-password');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
  },

  _showDashboard() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    this.loadStats();
  },

  async login() {
    const input = document.getElementById('admin-password');
    const err = document.getElementById('admin-login-error');
    const password = (input.value || '').trim();
    if (!password) { this._showError('비밀번호를 입력하세요.'); return; }

    try {
      const apiBase = window.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) { this._showError('비밀번호가 올바르지 않습니다.'); return; }
      const data = await res.json();
      this.token = data.token;
      err && err.classList.add('hidden');
      this._showDashboard();
    } catch (e) {
      this._showError('로그인 중 오류가 발생했습니다.');
    }
  },

  logout() {
    this.token = '';
    this._showLogin();
    App.showToast('로그아웃되었습니다.');
  },

  _showError(msg) {
    const err = document.getElementById('admin-login-error');
    if (err) { err.textContent = msg; err.classList.remove('hidden'); }
  },

  async loadStats() {
    const grid = document.getElementById('admin-stats');
    const breakdown = document.getElementById('admin-breakdown');
    grid.innerHTML = '<div class="admin-loading">불러오는 중…</div>';
    breakdown.innerHTML = '';

    try {
      const apiBase = window.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.status === 401) { this.token = ''; this._showLogin(); return; }
      if (!res.ok) throw new Error('stats load failed');
      const data = await res.json();
      this._renderStats(data);
    } catch (e) {
      grid.innerHTML = '<div class="admin-loading">통계를 불러오지 못했습니다.</div>';
    }
  },

  _renderStats(data) {
    const LABELS = {
      tbm: 'TBM', risk: '위험성평가', checklist: '안전점검',
      ptw: '작업허가서', accident: '사고', workplan: '작업계획서', proposals: '제안'
    };
    const ICONS = {
      tbm: '📝', risk: '⚠️', checklist: '✅', ptw: '🔑',
      accident: '🚨', workplan: '📋', proposals: '💡'
    };
    const grid = document.getElementById('admin-stats');
    grid.innerHTML = Object.keys(LABELS).map(k => `
      <div class="admin-stat-card">
        <span class="admin-stat-icon">${ICONS[k]}</span>
        <span class="admin-stat-num">${data.totals[k] ?? 0}</span>
        <span class="admin-stat-label">${LABELS[k]}</span>
      </div>`).join('');

    const breakdown = document.getElementById('admin-breakdown');
    const block = (title, obj) => {
      const entries = Object.entries(obj || {});
      if (!entries.length) return '';
      const items = entries.map(([k, v]) =>
        `<span class="admin-bd-item"><b>${k}</b> ${v}</span>`).join('');
      return `<div class="admin-bd-block"><div class="admin-bd-title">${title}</div><div class="admin-bd-items">${items}</div></div>`;
    };
    breakdown.innerHTML =
      block('제안 상태', data.proposalsByStatus) +
      block('위험성평가 개선', data.riskByStatus) +
      block('사고 유형', data.accidentByType);
  },

  async openGuestPerm() {
    await QRModal.open();
    QRModal.switchTab('guest');
  }
};

window.Admin = Admin;
