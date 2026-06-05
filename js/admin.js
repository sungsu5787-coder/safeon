// 관리자 종합관리 페이지 — 로그인 게이트 및 통계 대시보드를 담당하는 모듈
const Admin = {
  TOKEN_KEY: 'safeon_admin_token',
  USER_KEY:  'safeon_admin_user',

  get token() { return sessionStorage.getItem(this.TOKEN_KEY) || ''; },
  set token(v) {
    if (v) sessionStorage.setItem(this.TOKEN_KEY, v);
    else sessionStorage.removeItem(this.TOKEN_KEY);
  },

  get currentUser() {
    try { return JSON.parse(sessionStorage.getItem(this.USER_KEY) || 'null'); }
    catch { return null; }
  },
  set currentUser(v) {
    if (v) sessionStorage.setItem(this.USER_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(this.USER_KEY);
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
    const uInput = document.getElementById('admin-username');
    const pInput = document.getElementById('admin-password');
    if (pInput) pInput.value = '';
    if (uInput) { uInput.value = ''; setTimeout(() => uInput.focus(), 100); }
  },

  _showDashboard() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    this._renderUserBadge();
    this.switchTab('stats');
    this.loadStats();
    this.loadChangelog();
    if (window.App && App.renderLoginChip) App.renderLoginChip();
  },

  // 로그인 사용자 표시 + 사용자관리 탭은 admin 역할만 노출
  _renderUserBadge() {
    const u = this.currentUser;
    const badge = document.getElementById('admin-user-badge');
    if (badge) badge.textContent = u ? `${u.name} · ${u.role === 'admin' ? '관리자' : '부사수'}` : '';
    const usersTab = document.getElementById('admin-subtab-users');
    if (usersTab) usersTab.classList.toggle('hidden', !(u && u.role === 'admin'));
  },

  switchTab(tab) {
    const isUsers = tab === 'users';
    document.getElementById('admin-tab-stats').classList.toggle('hidden', isUsers);
    document.getElementById('admin-tab-users').classList.toggle('hidden', !isUsers);
    document.getElementById('admin-subtab-stats').classList.toggle('active', !isUsers);
    document.getElementById('admin-subtab-users').classList.toggle('active', isUsers);
    if (isUsers) this.loadUsers();
  },

  async login() {
    const uInput = document.getElementById('admin-username');
    const pInput = document.getElementById('admin-password');
    const username = (uInput.value || '').trim();
    const password = (pInput.value || '').trim();
    if (!username || !password) { this._showError('아이디와 비밀번호를 입력하세요.'); return; }

    try {
      const apiBase = window.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { this._showError(data.error || '로그인에 실패했습니다.'); return; }
      this.token = data.token;
      this.currentUser = data.user;
      const err = document.getElementById('admin-login-error');
      err && err.classList.add('hidden');
      this._showDashboard();
    } catch (e) {
      this._showError('로그인 중 오류가 발생했습니다.');
    }
  },

  logout() {
    this.token = '';
    this.currentUser = null;
    location.reload();   // 하드 게이트로 복귀 (로그인해야 다시 진입)
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

  async loadChangelog() {
    const box = document.getElementById('admin-changelog');
    box.innerHTML = '<div class="admin-loading">불러오는 중…</div>';
    try {
      const apiBase = window.API_BASE_URL || '';
      const res = await fetch(`${apiBase}/data/changelog.json?t=${Date.now()}`);
      if (!res.ok) throw new Error('changelog load failed');
      const list = await res.json();
      this._renderChangelog(list);
    } catch (e) {
      box.innerHTML = '<div class="admin-loading">버전 내역을 불러오지 못했습니다.</div>';
    }
  },

  _renderChangelog(list) {
    const TYPE = {
      feat: { label: '기능', cls: 'feat' },
      fix:  { label: '수정', cls: 'fix' },
      chore:{ label: '관리', cls: 'chore' }
    };
    const curVer = document.getElementById('admin-cur-ver');
    if (curVer && list.length) curVer.textContent = `현재 v${list[0].version}`;

    const box = document.getElementById('admin-changelog');
    box.innerHTML = list.map(entry => {
      const t = TYPE[entry.type] || { label: '변경', cls: 'chore' };
      const items = (entry.changes || []).map(c => `<li>${c}</li>`).join('');
      return `
        <div class="admin-cl-entry">
          <div class="admin-cl-head">
            <span class="admin-cl-ver">v${entry.version}</span>
            <span class="admin-cl-badge admin-cl-${t.cls}">${t.label}</span>
            <span class="admin-cl-date">${entry.date || ''}</span>
          </div>
          <ul class="admin-cl-list">${items}</ul>
        </div>`;
    }).join('');
  },

  // ── 사용자 계정 관리 (admin 역할) ──────────────────────────
  async _authFetch(url, opts = {}) {
    const apiBase = window.API_BASE_URL || '';
    const res = await fetch(`${apiBase}${url}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}`, ...(opts.headers || {}) }
    });
    if (res.status === 401) { this.token = ''; this.currentUser = null; this._showLogin(); throw new Error('unauthorized'); }
    return res;
  },

  async loadUsers() {
    const box = document.getElementById('admin-users-list');
    box.innerHTML = '<div class="admin-loading">불러오는 중…</div>';
    try {
      const res = await this._authFetch('/api/admin/users');
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) { this._renderUsersSetupNeeded(); return; }
      if (!res.ok) throw new Error(data.error || '목록을 불러오지 못했습니다.');
      this._renderUsers(data.users || []);
    } catch (e) {
      if (e.message !== 'unauthorized')
        box.innerHTML = `<div class="admin-loading">계정 목록을 불러오지 못했습니다.<br><small>${e.message}</small></div>`;
    }
  },

  // Admin SDK 미설정(503) 시 — 빨간 오류 대신 안내 패널 + 작동 안 하는 계정추가 버튼 숨김
  _renderUsersSetupNeeded() {
    const addBtn = document.querySelector('.admin-user-add-btn');
    if (addBtn) addBtn.classList.add('hidden');
    this.hideAddUser();
    const box = document.getElementById('admin-users-list');
    box.innerHTML = `
      <div class="admin-setup-needed">
        <div class="admin-setup-icon">🔧</div>
        <p class="admin-setup-title">직원별 계정 기능은 준비 중이에요.</p>
        <p class="admin-setup-desc">지금은 <b>관리자 비밀번호 한 개</b>로 로그인하는 단순 모드로 동작하고 있어요. Firebase 관리자 설정을 마치면 직원마다 아이디·비밀번호를 만들고, 누가 어떤 작업을 했는지도 볼 수 있어요.</p>
      </div>`;
  },

  _renderUsers(users) {
    const box = document.getElementById('admin-users-list');
    if (!users.length) { box.innerHTML = '<div class="admin-loading">등록된 계정이 없습니다.</div>'; return; }
    const me = this.currentUser;
    box.innerHTML = users.map(u => {
      const isMe = me && me.uid === u.uid;
      const roleLabel = u.role === 'admin' ? '관리자' : '부사수';
      const safeName = (u.name || '').replace(/'/g, "\\'");
      return `
        <div class="admin-user-row ${u.active ? '' : 'inactive'}">
          <div class="admin-user-main" onclick="Admin.viewUserHistory('${u.uid}','${safeName}')">
            <span class="admin-user-name">${u.name}${isMe ? ' <span class="admin-user-me">나</span>' : ''}</span>
            <span class="admin-user-id">@${u.username} · 작업내역 보기</span>
          </div>
          <span class="admin-user-role role-${u.role}">${roleLabel}</span>
          <div class="admin-user-acts">
            <button class="admin-user-act" onclick="Admin.resetUserPassword('${u.uid}','${safeName}')">비번</button>
            <button class="admin-user-act ${u.active ? 'deact' : 'act'}" onclick="Admin.toggleUserActive('${u.uid}',${u.active})">${u.active ? '비활성' : '활성'}</button>
          </div>
        </div>`;
    }).join('');
  },

  async viewUserHistory(uid, name) {
    const modal = document.getElementById('admin-history-modal');
    const title = document.getElementById('admin-history-title');
    const body  = document.getElementById('admin-history-body');
    title.textContent = `${name} 작업 내역`;
    body.innerHTML = '<div class="admin-loading">불러오는 중…</div>';
    modal.classList.remove('hidden');
    try {
      const res = await this._authFetch(`/api/admin/users/${uid}/history`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '내역을 불러오지 못했습니다.');
      this._renderHistory(data);
    } catch (e) {
      if (e.message !== 'unauthorized') body.innerHTML = `<div class="admin-loading">${e.message}</div>`;
    }
  },

  closeHistory() {
    document.getElementById('admin-history-modal').classList.add('hidden');
  },

  _renderHistory(data) {
    const LABELS = { tbm: 'TBM', risk: '위험성평가', checklist: '안전점검', ptw: '작업허가서', accident: '사고보고', workplan: '작업계획서' };
    const body = document.getElementById('admin-history-body');
    if (!data.total) {
      body.innerHTML = '<div class="admin-loading">기록된 작업이 없습니다.<br><small>로그인 후 작성한 문서부터 집계됩니다.</small></div>';
      return;
    }
    const counts = Object.entries(LABELS).map(([k, label]) =>
      `<div class="admin-hist-stat"><span class="admin-hist-num">${data.counts[k] || 0}</span><span class="admin-hist-label">${label}</span></div>`).join('');
    const recent = (data.recent || []).map(r =>
      `<div class="admin-hist-row"><span class="admin-hist-type">${LABELS[r.type] || r.type}</span><span class="admin-hist-date">${r.date || '-'}</span></div>`).join('');
    body.innerHTML = `
      <div class="admin-hist-total">총 <b>${data.total}</b>건</div>
      <div class="admin-hist-stats">${counts}</div>
      <div class="admin-hist-recent-title">최근 작업</div>
      <div class="admin-hist-recent">${recent || '<div class="admin-loading">-</div>'}</div>`;
  },

  showAddUser() {
    document.getElementById('admin-user-form').classList.remove('hidden');
    document.getElementById('nu-username').value = '';
    document.getElementById('nu-name').value = '';
    document.getElementById('nu-password').value = '';
    document.getElementById('nu-role').value = 'staff';
    const err = document.getElementById('admin-user-form-error');
    if (err) err.classList.add('hidden');
    setTimeout(() => document.getElementById('nu-username').focus(), 50);
  },

  hideAddUser() {
    document.getElementById('admin-user-form').classList.add('hidden');
  },

  async addUser() {
    const username = document.getElementById('nu-username').value.trim();
    const name     = document.getElementById('nu-name').value.trim();
    const password = document.getElementById('nu-password').value;
    const role     = document.getElementById('nu-role').value;
    const err = document.getElementById('admin-user-form-error');
    const showErr = (m) => { if (err) { err.textContent = m; err.classList.remove('hidden'); } };

    if (!username || !name || !password) { showErr('아이디·이름·비밀번호를 모두 입력하세요.'); return; }
    if (password.length < 6) { showErr('비밀번호는 6자 이상이어야 합니다.'); return; }

    try {
      const res = await this._authFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ username, name, password, role }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showErr(data.error || '추가에 실패했습니다.'); return; }
      this.hideAddUser();
      App.showToast(`✅ ${name} 계정이 추가되었습니다.`);
      this.loadUsers();
    } catch (e) { if (e.message !== 'unauthorized') showErr(e.message); }
  },

  async toggleUserActive(uid, active) {
    const next = !active;
    if (!next && !(await App.confirm('이 계정을 비활성화하면 로그인할 수 없게 됩니다. 계속할까요?', { type: 'warning', title: '계정 비활성화', icon: '🔒' }))) return;
    try {
      const res = await this._authFetch(`/api/admin/users/${uid}`, { method: 'PATCH', body: JSON.stringify({ active: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { App.showToast('⚠️ ' + (data.error || '변경에 실패했습니다.')); return; }
      App.showToast(next ? '✅ 활성화되었습니다.' : '🔒 비활성화되었습니다.');
      this.loadUsers();
    } catch (e) { if (e.message !== 'unauthorized') App.showToast('⚠️ ' + e.message); }
  },

  async resetUserPassword(uid, name) {
    const pw = window.prompt(`${name} 계정의 새 비밀번호 (6자 이상)`);
    if (pw == null) return;
    if (pw.trim().length < 6) { App.showToast('⚠️ 비밀번호는 6자 이상이어야 합니다.'); return; }
    try {
      const res = await this._authFetch(`/api/admin/users/${uid}`, { method: 'PATCH', body: JSON.stringify({ password: pw.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { App.showToast('⚠️ ' + (data.error || '변경에 실패했습니다.')); return; }
      App.showToast('✅ 비밀번호가 변경되었습니다.');
    } catch (e) { if (e.message !== 'unauthorized') App.showToast('⚠️ ' + e.message); }
  },

  async openGuestPerm() {
    await QRModal.open();
    QRModal.switchTab('guest');
  }
};

window.Admin = Admin;
