// ===== App Core =====
const App = {
  currentPage: 'home',
  pageHistory: [],

  // 게스트 모드
  guestMode: false,
  guestPerms: [],   // 허용된 페이지 목록 (예: ['workplan', 'tbm'])

  // 페이지 → 표시명 매핑
  _PAGE_LABELS: {
    workplan:  '작업계획서',
    tbm:       'TBM',
    risk:      '위험성평가',
    checklist: '안전점검',
    ptw:       '작업허가서',
    accident:  '사고보고서',
    history:   '이력조회',
    proposals: '제안 관리'
  },

  async init() {
    this.initGuestMode();   // 가장 먼저 실행
    this.setupNavigation();
    this.setupDate();
    this.updateDashboard();
    if (!this.guestMode) {
      try {
        await QRModal.refresh();
      } catch (e) {
        console.warn('[App] QR 초기화 실패', e);
      }
    }
    this.renderProposalQR();
    this.updatePTWBadge();
    this.setupOfflineDetection();
    if (!this.guestMode) this.setupPWAInstall();
    TBM.init();
    Risk.init();
    Checklist.init();
    History.init();
    WorkPlan.init();
    PTW.init();
    Accident.init();
    if (!this.guestMode) this.loadAccessUrl();
    Notify.init();
  },

  // ── 게스트 모드 초기화 ───────────────────────────────────
  initGuestMode() {
    const params = new URLSearchParams(location.search);
    if (params.get('guest') !== '1') return;

    this.guestMode  = true;
    this.guestPerms = (params.get('perm') || 'workplan').split(',').map(s => s.trim()).filter(Boolean);

    // 게스트 배너 표시
    const banner = document.getElementById('guest-banner');
    const text   = document.getElementById('guest-banner-text');
    if (banner) banner.classList.remove('hidden');
    if (text) {
      const labels = this.guestPerms.map(p => this._PAGE_LABELS[p] || p).join(', ');
      text.textContent = `🔒 게스트 모드 — ${labels} 읽기 전용`;
    }

    // QR 탭 숨김 (게스트가 다시 게스트 QR 못 만들게)
    const tabs = document.getElementById('qr-tabs');
    if (tabs) tabs.classList.add('hidden');

    // body에 클래스 추가 → CSS로 전체 제어
    document.body.classList.add('guest-mode');

    // 접근 불가 메뉴카드·네비 숨김
    this._applyGuestRestrictions();
  },

  _applyGuestRestrictions() {
    const perms = this.guestPerms;

    // 메뉴카드 (홈 화면)
    document.querySelectorAll('[data-page]').forEach(el => {
      const page = el.dataset.page;
      if (page && page !== 'home' && !perms.includes(page)) {
        el.style.display = 'none';
      }
    });

    // 하단 네비게이션
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      const page = btn.dataset.page;
      if (page && !perms.includes(page) && page !== 'home') {
        btn.style.display = 'none';
      }
    });

    // FAB (TBM 버튼)
    const fab = document.querySelector('.nav-fab');
    if (fab && !perms.includes('tbm')) fab.style.display = 'none';
  },

  // 게스트 접근 가능 여부
  canAccess(page) {
    if (!this.guestMode) return true;
    if (page === 'home' || page === 'detail') return true;
    return this.guestPerms.includes(page);
  },

  setupOfflineDetection() {
    const banner = document.getElementById('offline-banner');

    const update = (fromEvent) => {
      if (!navigator.onLine) {
        if (banner) banner.classList.remove('hidden');
        if (fromEvent) this.showToast('📵 오프라인 — 저장된 데이터로 계속 사용 가능합니다');
      } else {
        if (banner) banner.classList.add('hidden');
        if (fromEvent) this.showToast('🌐 인터넷 연결 복구됨');
      }
    };

    window.addEventListener('online',  () => { update(true); this.checkOfflineReady(); });
    window.addEventListener('offline', () => update(true));
    update(false); // 초기 상태 확인

    // 페이지 포커스 시 오프라인 상태 재확인
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        update(false);
        this.checkOfflineReady();
      }
    });
  },

  setupNavigation() {
    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigateTo(btn.dataset.page);
      });
    });

    // Menu cards (standard 2×2 grid)
    document.querySelectorAll('.menu-card').forEach(card => {
      card.addEventListener('click', () => {
        this.navigateTo(card.dataset.page);
      });
    });

    // Featured cards (TBM / PTW full-width)
    document.querySelectorAll('.menu-card-featured').forEach(card => {
      card.addEventListener('click', () => {
        this.navigateTo(card.dataset.page);
      });
    });

    // FAB (center TBM button in bottom nav)
    const fab = document.querySelector('.nav-fab');
    if (fab) {
      fab.addEventListener('click', () => {
        this.navigateTo(fab.dataset.page);
      });
    }

    // Back button
    document.getElementById('btn-back').addEventListener('click', () => {
      this.goBack();
    });
  },

  navigateTo(page, pushHistory = true) {
    // 게스트 접근 제한
    if (!this.canAccess(page)) {
      this.showToast(`🔒 게스트 모드 — ${this._PAGE_LABELS[page] || page} 접근 권한이 없습니다`);
      return;
    }

    if (pushHistory && this.currentPage !== page) {
      this.pageHistory.push(this.currentPage);
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    // FAB active state
    const fabBtn = document.querySelector('.nav-fab');
    if (fabBtn) fabBtn.classList.toggle('active', page === 'tbm');

    // Update header — brand on home, page title on other pages
    const titles = {
      home:      '현장 안전보건',
      tbm:       'TBM 작성',
      risk:      '위험성 평가',
      checklist: '안전점검',
      history:   '이력조회',
      detail:    '상세보기',
      workplan:  '작업계획서',
      ptw:       '작업허가서 (PTW)',
      accident:  '안전사고 보고서',
      proposals: '제안 관리'
    };
    const brandEl = document.getElementById('header-brand');
    const titleEl = document.getElementById('page-title');
    if (page === 'home') {
      brandEl && brandEl.classList.remove('hidden');
      titleEl && titleEl.classList.add('hidden');
    } else {
      brandEl && brandEl.classList.add('hidden');
      titleEl && titleEl.classList.remove('hidden');
      titleEl.textContent = titles[page] || 'SAMHWA SafeOn';
    }

    // Back button visibility
    document.getElementById('btn-back').classList.toggle('hidden', page === 'home');

    // QR 버튼 — 게스트 포함 모든 페이지에서 항상 표시
    const qrBtn = document.getElementById('btn-qr');
    if (qrBtn) qrBtn.classList.remove('hidden');

    this.currentPage = page;

    // 페이지별 후처리
    if (page === 'history')   History.loadHistory();
    if (page === 'workplan')  WorkPlan.onPageShow();
    if (page === 'ptw')       PTW.onPageShow();
    if (page === 'accident')  Accident.onPageShow();
    if (page === 'proposals') ProposalsView.onPageShow();

    window.scrollTo(0, 0);
  },

  goBack() {
    const prev = this.pageHistory.pop() || 'home';
    this.navigateTo(prev, false);
  },

  setupDate() {
    const _render = () => {
      const now  = new Date();
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const hh   = String(now.getHours()).padStart(2, '0');
      const mm   = String(now.getMinutes()).padStart(2, '0');
      const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
      const el = document.getElementById('today-date');
      if (el) el.innerHTML =
        `${dateStr} <span class="today-time">${hh}:${mm}</span>`;
    };

    _render();

    // 매 분 정각마다 시간 업데이트
    const now = new Date();
    const msToNextMin = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
      _render();
      setInterval(_render, 60000);
    }, msToNextMin);

    const hour = new Date().getHours();
    let greeting = '안녕하세요';
    if (hour < 12) greeting = '좋은 아침입니다';
    else if (hour < 18) greeting = '안녕하세요';
    else greeting = '수고하셨습니다';
    document.getElementById('greeting-text').textContent = greeting;

    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (!input.value) input.value = today;
    });
  },

  // ── PTW 네비 배지 업데이트 ────────────────────────────────
  updatePTWBadge() {
    const pending = JSON.parse(localStorage.getItem('wp_ptw_pending') || '[]');
    const badge   = document.getElementById('ptw-nav-badge');
    if (!badge) return;
    if (pending.length > 0) {
      badge.textContent = pending.length > 9 ? '9+' : pending.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  async updateDashboard(from, to) {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.substring(0, 8) + '01';
    const dateFrom = from || firstOfMonth;
    const dateTo   = to   || today;

    // 날짜 input 동기화 (초기 로드 시)
    const fromEl = document.getElementById('dash-date-from');
    const toEl   = document.getElementById('dash-date-to');
    if (fromEl && !fromEl.value) fromEl.value = firstOfMonth;
    if (toEl   && !toEl.value)   toEl.value   = today;

    try {
      const q = (col) => dateFrom === dateTo
        ? col.where('date', '==', dateFrom).get()
        : col.where('date', '>=', dateFrom).where('date', '<=', dateTo).get();

      const [tbmSnap, riskSnap, checkSnap, wpSnap, ptwSnap, accSnap] = await Promise.all([
        q(collections.tbm),
        q(collections.risk),
        q(collections.checklist),
        q(collections.workplan),
        q(collections.ptw),
        q(collections.accident)
      ]);
      let proposalCount = 0;
      try {
        const apiBase = window.API_BASE_URL || '';
        const proposalRes = await fetch(`${apiBase}/api/proposal-count`);
        if (proposalRes.ok) {
          const proposalData = await proposalRes.json();
          proposalCount = typeof proposalData.count === 'number' ? proposalData.count : 0;
        }
      } catch (proposalErr) {
        console.warn('[Dashboard] proposal count load failed', proposalErr.message || proposalErr);
      }
      document.getElementById('today-tbm-count').textContent      = tbmSnap.size;
      document.getElementById('today-risk-count').textContent     = riskSnap.size;
      document.getElementById('today-check-count').textContent    = checkSnap.size;
      document.getElementById('today-wp-count').textContent       = wpSnap.size;
      document.getElementById('today-ptw-count').textContent      = ptwSnap.size;
      document.getElementById('today-accident-count').textContent = accSnap.size;
      const proposalEl = document.getElementById('today-proposal-count');
      if (proposalEl) proposalEl.textContent = proposalCount;
    } catch (err) {
      console.log('Dashboard update:', err.message);
    }
  },

  updateDashboardRange() {
    const from  = document.getElementById('dash-date-from').value;
    const to    = document.getElementById('dash-date-to').value;
    if (!from || !to) return;
    if (from > to) {
      document.getElementById('dash-date-to').value = from;
      return this.updateDashboardRange();
    }
    const today        = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.substring(0, 8) + '01';
    const title = document.getElementById('dashboard-period-title');
    if (title) {
      if (from === today && to === today)             title.textContent = '오늘의 현황';
      else if (from === firstOfMonth && to === today) title.textContent = '이번 달 현황';
      else if (from === to)                           title.textContent = `${from} 현황`;
      else                                            title.textContent = `기간 현황 (${from} ~ ${to})`;
    }
    this.updateDashboard(from, to);
  },

  resetDashboardToToday() {
    const today        = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.substring(0, 8) + '01';
    const fromEl = document.getElementById('dash-date-from');
    const toEl   = document.getElementById('dash-date-to');
    if (fromEl) fromEl.value = firstOfMonth;
    if (toEl)   toEl.value   = today;
    const title = document.getElementById('dashboard-period-title');
    if (title) title.textContent = '이번 달 현황';
    this.updateDashboard();
  },

  _toastTimer: null,
  showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  },

  getAppBaseUrl() {
    const href = location.href.split('?')[0].split('#')[0];
    const basePath = href.replace(/\/index\.html$/, '/').replace(/\/$/, '/') ;
    if (location.origin && location.origin !== 'null' && href.startsWith(location.origin)) {
      return location.origin.replace(/\/$/, '') + basePath.substring(location.origin.length);
    }
    return basePath;
  },

  getProposalUrl() {
    const baseUrl = QRModal && QRModal._appUrl ? QRModal._appUrl : this.getAppBaseUrl();
    return new URL('proposal.html', baseUrl).href;
  },

  renderProposalQR() {
    const url = this.getProposalUrl();
    const qrWrap = document.getElementById('proposal-qr-wrap');
    const urlText = document.getElementById('proposal-url-text');
    if (!qrWrap || !urlText) return;
    urlText.textContent = url;
    qrWrap.innerHTML = '';

    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      const cell = 5;
      const margin = 12;
      const count = qr.getModuleCount();
      const size = count * cell + margin * 2;
      let rects = '';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            rects += `<rect x="${c*cell+margin}" y="${r*cell+margin}" width="${cell}" height="${cell}" fill="#0d47a1"/>`;
          }
        }
      }
      qrWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="border-radius:14px;display:block">` +
        `<rect width="${size}" height="${size}" fill="#fff" rx="14"/>${rects}</svg>`;
    } catch (err) {
      qrWrap.innerHTML = '<p style="color:#d93025;font-size:13px;margin:0">QR 생성 실패</p>';
    }
  },

  async copyProposalUrl() {
    const url = this.getProposalUrl();
    try {
      await navigator.clipboard.writeText(url);
      this.showToast('제안 QR 주소가 복사되었습니다 📋');
    } catch (e) {
      window.prompt('아래 주소를 복사하세요', url);
    }
  },

  // ══════════════════════════════════════════════════════════
  //  전역 확인 모달  — App.confirm(msg, options) → Promise<bool>
  //  options: { title, type:'save'|'delete'|'warning', icon }
  // ══════════════════════════════════════════════════════════
  confirm(msg, options = {}) {
    return new Promise(resolve => {
      const {
        title = options.type === 'delete' ? '삭제하시겠습니까?' : '저장하시겠습니까?',
        type  = 'save',
        icon  = type === 'delete' ? '🗑️' : type === 'warning' ? '⚠️' : '💾'
      } = options;

      const overlay  = document.getElementById('confirm-modal');
      const iconEl   = document.getElementById('confirm-icon');
      const titleEl  = document.getElementById('confirm-title');
      const msgEl    = document.getElementById('confirm-msg');
      const okBtn    = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');
      const box      = overlay.querySelector('.confirm-box');

      // 내용 설정
      iconEl.textContent  = icon;
      titleEl.textContent = title;
      msgEl.innerHTML     = msg || '';

      // 타입별 스타일
      box.className = 'confirm-box confirm-type-' + type;
      okBtn.className = 'confirm-btn-ok confirm-ok-' + type;

      // 표시
      overlay.classList.remove('hidden');
      requestAnimationFrame(() =>
        requestAnimationFrame(() => overlay.classList.add('confirm-visible'))
      );
      cancelBtn.focus();

      // 이벤트 핸들러 (한 번만 실행)
      const close = (result) => {
        overlay.classList.remove('confirm-visible');
        setTimeout(() => overlay.classList.add('hidden'), 200);
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      };

      const onOk      = () => close(true);
      const onCancel  = () => close(false);
      const onOverlay = (e) => { if (e.target === overlay) close(false); };
      const onKey     = (e) => {
        if (e.key === 'Enter')  { e.preventDefault(); close(true);  }
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
      };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onKey);
    });
  },

  formatDateTime(dtStr) {
    if (!dtStr) return '-';
    const d = new Date(dtStr);
    return `${this.formatDate(dtStr)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  _detailType: null,
  _detailData: null,
  _detailId:   null,
  _isEditMode: false,

  showDetail(type, id) {
    this.navigateTo('detail');
    this.loadDetail(type, id);
  },

  async loadDetail(type, id) {
    const container = document.getElementById('detail-content');
    container.innerHTML = '<p class="empty-state">로딩 중...</p>';

    try {
      const doc = await collections[type].doc(id).get();
      if (!doc.exists) {
        container.innerHTML = '<p class="empty-state">데이터를 찾을 수 없습니다.</p>';
        return;
      }

      const data = doc.data();
      this._detailType = type;
      this._detailData = data;
      this._detailId   = id;
      this._isEditMode = false;

      let html = '';
      if (type === 'tbm')           html = this.renderTBMDetail(data);
      else if (type === 'risk')     html = this.renderRiskDetail(data);
      else if (type === 'checklist')html = this.renderChecklistDetail(data);
      else if (type === 'workplan') html = this.renderWorkPlanDetail(data);
      else if (type === 'ptw')      html = this.renderPTWDetail(data);
      else if (type === 'accident') html = this.renderAccidentDetail(data);

      container.innerHTML = html;

      document.getElementById('btn-delete-record').onclick = async () => {
        const typeLabel = { tbm:'TBM', risk:'위험성평가', checklist:'안전점검', workplan:'작업계획서', ptw:'작업허가서', accident:'사고보고서' };
        const ok = await App.confirm(
          `<b>${typeLabel[type] || '기록'}</b> 1건을 영구 삭제합니다.<br>삭제된 데이터는 복구할 수 없습니다.`,
          { type: 'delete', title: '기록을 삭제하시겠습니까?' }
        );
        if (ok) {
          await collections[type].doc(id).delete();
          App.showToast('🗑️ 삭제되었습니다');
          App.goBack();
          App.updateDashboard();
          History.loadHistory();
        }
      };
    } catch (err) {
      container.innerHTML = '<p class="empty-state">오류가 발생했습니다.</p>';
      console.error(err);
    }
  },

  // ════════════════════════════════════════════════════════════
  //  인라인 수정 모드
  // ════════════════════════════════════════════════════════════
  _toggleEditBtns(editMode) {
    document.getElementById('detail-view-btns').classList.toggle('hidden',  editMode);
    document.getElementById('detail-edit-btns').classList.toggle('hidden', !editMode);
  },

  _startEdit() {
    if (!this._detailData) return;
    this._isEditMode = true;
    const container = document.getElementById('detail-content');
    const type = this._detailType;
    const d    = this._detailData;

    let html = '';
    if      (type === 'tbm')       html = this._editFormTBM(d);
    else if (type === 'workplan')  html = this._editFormWorkPlan(d);
    else if (type === 'risk')      html = this._editFormRisk(d);
    else if (type === 'checklist') html = this._editFormChecklist(d);
    else if (type === 'accident')  html = this._editFormAccident(d);
    else if (type === 'ptw')       html = this._editFormPTW(d);

    container.innerHTML = html;
    this._toggleEditBtns(true);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  _cancelEdit() {
    this._isEditMode = false;
    this._toggleEditBtns(false);
    const container = document.getElementById('detail-content');
    const d = this._detailData;
    const type = this._detailType;
    let html = '';
    if      (type === 'tbm')       html = this.renderTBMDetail(d);
    else if (type === 'risk')      html = this.renderRiskDetail(d);
    else if (type === 'checklist') html = this.renderChecklistDetail(d);
    else if (type === 'workplan')  html = this.renderWorkPlanDetail(d);
    else if (type === 'ptw')       html = this.renderPTWDetail(d);
    else if (type === 'accident')  html = this.renderAccidentDetail(d);
    container.innerHTML = html;
  },

  async _saveEdit() {
    const type = this._detailType;
    const id   = this._detailId;
    if (!type || !id) return;

    const v = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.value.trim() : '';
    };
    const vn = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.value || '').trim() : '';
    };

    let updates = {};

    if (type === 'tbm') {
      const participantsRaw = v('[data-edit="participants"]');
      const participants = participantsRaw
        ? participantsRaw.split('\n').map(s => s.trim()).filter(Boolean)
        : [];
      updates = {
        date:         v('[data-edit="date"]'),
        workName:     v('[data-edit="workName"]'),
        location:     v('[data-edit="location"]'),
        workers:      parseInt(vn('[data-edit="workers"]')) || 0,
        content:      v('[data-edit="content"]'),
        hazards:      v('[data-edit="hazards"]'),
        measures:     v('[data-edit="measures"]'),
        instructions: v('[data-edit="instructions"]'),
        supervisor:   v('[data-edit="supervisor"]'),
        participants,
      };
    } else if (type === 'workplan') {
      const crewRaw = v('[data-edit="crew"]');
      const crew = crewRaw
        ? crewRaw.split('\n').map(line => {
            const [name, role] = line.split('/').map(s => s.trim());
            return name ? { name, role: role || '' } : null;
          }).filter(Boolean)
        : [];
      updates = {
        date:       v('[data-edit="date"]'),
        company:    v('[data-edit="company"]'),
        workName:   v('[data-edit="workName"]'),
        location:   v('[data-edit="location"]'),
        period:     v('[data-edit="period"]'),
        workers:    vn('[data-edit="workers"]'),
        supervisor: v('[data-edit="supervisor"]'),
        equipment:  v('[data-edit="equipment"]'),
        content:    v('[data-edit="content"]'),
        hazards:    v('[data-edit="hazards"]'),
        measures:   v('[data-edit="measures"]'),
        crew,
      };
    } else if (type === 'risk') {
      updates = {
        date:        v('[data-edit="date"]'),
        workName:    v('[data-edit="workName"]'),
        location:    v('[data-edit="location"]'),
        department:  v('[data-edit="department"]'),
        assessor:    v('[data-edit="assessor"]'),
        planDate:    v('[data-edit="planDate"]'),
        completeDate:v('[data-edit="completeDate"]'),
      };
    } else if (type === 'checklist') {
      // 기본 필드 수집
      const results = {};
      document.querySelectorAll('.cl-edit-item').forEach(function(item) {
        const itemName = item.dataset.item;
        const activeBtn = item.querySelector('.cl-edit-btn.active-pass, .cl-edit-btn.active-fail, .cl-edit-btn.active-na');
        results[itemName] = activeBtn ? activeBtn.dataset.val : 'unchecked';
      });
      updates = {
        date:      v('[data-edit="date"]'),
        location:  v('[data-edit="location"]'),
        inspector: v('[data-edit="inspector"]'),
        opinion:   v('[data-edit="opinion"]'),
        results:   Object.keys(results).length ? results : (this._detailData.results || {}),
      };
    } else if (type === 'accident') {
      updates = {
        date:           v('[data-edit="date"]'),
        time:           v('[data-edit="time"]'),
        location:       v('[data-edit="location"]'),
        reporter:       v('[data-edit="reporter"]'),
        department:     v('[data-edit="department"]'),
        injuredName:    v('[data-edit="injuredName"]'),
        injuredInfo:    v('[data-edit="injuredInfo"]'),
        injuredPart:    v('[data-edit="injuredPart"]'),
        injuredLevel:   v('[data-edit="injuredLevel"]'),
        content:        v('[data-edit="content"]'),
        cause:          v('[data-edit="cause"]'),
        immediateAction:v('[data-edit="immediateAction"]'),
        preventionPlan: v('[data-edit="preventionPlan"]'),
      };
    } else if (type === 'ptw') {
      updates = {
        date:         v('[data-edit="date"]'),
        company:      v('[data-edit="company"]'),
        requestorName:v('[data-edit="requestorName"]'),
        workName:     v('[data-edit="workName"]'),
        location:     v('[data-edit="location"]'),
        workers:      v('[data-edit="workers"]'),
        requestNotes: v('[data-edit="requestNotes"]'),
        checkerMemo:  v('[data-edit="checkerMemo"]'),
        permitContent:v('[data-edit="permitContent"]'),
      };
    }

    if (!Object.keys(updates).length) return;

    // 빈 필수 항목 체크
    const requiredMap = {
      tbm:      ['workName', 'date'],
      workplan: ['workName', 'date', 'company'],
      risk:     ['workName', 'date'],
      accident: ['date', 'description'],
      ptw:      ['workName', 'date'],
    };
    for (const field of (requiredMap[type] || [])) {
      if (!updates[field]) {
        this.showToast('필수 항목을 입력하세요');
        document.querySelector(`[data-edit="${field}"]`)?.focus();
        return;
      }
    }

    const ok = await this.confirm('변경 내용을 저장하시겠습니까?', {
      type: 'save', title: '수정 저장', icon: '💾'
    });
    if (!ok) return;

    const saveBtn = document.getElementById('btn-save-edit');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    try {
      await collections[type].doc(id).update(updates);
      // 로컬 데이터도 업데이트
      this._detailData = Object.assign({}, this._detailData, updates);
      this._isEditMode = false;
      this._toggleEditBtns(false);
      // 갱신된 데이터로 뷰 재렌더
      const container = document.getElementById('detail-content');
      const d = this._detailData;
      let html = '';
      if      (type === 'tbm')       html = this.renderTBMDetail(d);
      else if (type === 'risk')      html = this.renderRiskDetail(d);
      else if (type === 'checklist') html = this.renderChecklistDetail(d);
      else if (type === 'workplan')  html = this.renderWorkPlanDetail(d);
      else if (type === 'ptw')       html = this.renderPTWDetail(d);
      else if (type === 'accident')  html = this.renderAccidentDetail(d);
      container.innerHTML = html;
      this.showToast('✅ 수정이 저장됐습니다');
      History.loadHistory();
    } catch (err) {
      console.error(err);
      this.showToast('저장 오류: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span>💾</span> 수정 저장';
    }
  },

  // ── 수정 폼 렌더 — TBM ────────────────────────────────────
  _editFormTBM(d) {
    const esc = s => this.escapeHtml(s || '');
    const participantsText = (d.participants || []).join('\n');
    return `
      <div class="edit-notice">✏️ 수정 모드 — 내용을 변경 후 <b>수정 저장</b>을 눌러주세요</div>
      <div class="detail-section ds-date">
        <h3><span class="ds-icon">📅</span>작업일자</h3>
        <input class="edit-input" data-edit="date" type="date" value="${esc(d.date)}">
      </div>
      <div class="detail-section ds-name">
        <h3><span class="ds-icon">🔧</span>공종/작업명</h3>
        <input class="edit-input" data-edit="workName" type="text" value="${esc(d.workName)}">
      </div>
      <div class="detail-row-2">
        <div class="detail-section ds-location">
          <h3><span class="ds-icon">📍</span>작업장소</h3>
          <input class="edit-input" data-edit="location" type="text" value="${esc(d.location)}">
        </div>
        <div class="detail-section ds-workers">
          <h3><span class="ds-icon">👷</span>인원</h3>
          <input class="edit-input edit-input-sm" data-edit="workers" type="number" min="1" value="${esc(d.workers)}">
        </div>
      </div>
      <div class="detail-section ds-content">
        <h3><span class="ds-icon">📋</span>작업내용</h3>
        <textarea class="edit-textarea" data-edit="content" rows="3">${esc(d.content)}</textarea>
      </div>
      <div class="detail-section ds-hazard">
        <h3><span class="ds-icon">⚠️</span>위험요인</h3>
        <textarea class="edit-textarea" data-edit="hazards" rows="3">${esc(d.hazards)}</textarea>
      </div>
      <div class="detail-section ds-measure">
        <h3><span class="ds-icon">🛡️</span>안전대책</h3>
        <textarea class="edit-textarea" data-edit="measures" rows="3">${esc(d.measures)}</textarea>
      </div>
      <div class="detail-section ds-instruction">
        <h3><span class="ds-icon">📣</span>특별 지시사항</h3>
        <textarea class="edit-textarea" data-edit="instructions" rows="2">${esc(d.instructions)}</textarea>
      </div>
      <div class="detail-section ds-people">
        <h3><span class="ds-icon">👥</span>참석자</h3>
        <p class="edit-hint">한 줄에 한 명씩 입력하세요</p>
        <textarea class="edit-textarea" data-edit="participants" rows="4">${esc(participantsText)}</textarea>
      </div>
      <div class="detail-section ds-supervisor">
        <h3><span class="ds-icon">👔</span>관리감독자</h3>
        <input class="edit-input" data-edit="supervisor" type="text" value="${esc(d.supervisor)}">
      </div>`;
  },

  // ── 수정 폼 렌더 — 작업계획서 ─────────────────────────────
  _editFormWorkPlan(d) {
    const esc = s => this.escapeHtml(s || '');
    const crewText = (d.crew || []).map(c => c.name + (c.role ? '/' + c.role : '')).join('\n');
    return `
      <div class="edit-notice">✏️ 수정 모드 — 내용을 변경 후 <b>수정 저장</b>을 눌러주세요</div>
      <div class="detail-section ds-date">
        <h3><span class="ds-icon">📅</span>작성일자</h3>
        <input class="edit-input" data-edit="date" type="date" value="${esc(d.date)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">🏢</span>업체명</h3>
        <input class="edit-input" data-edit="company" type="text" value="${esc(d.company)}">
      </div>
      <div class="detail-section ds-name">
        <h3><span class="ds-icon">🔧</span>공종/작업명</h3>
        <input class="edit-input" data-edit="workName" type="text" value="${esc(d.workName)}">
      </div>
      <div class="detail-section ds-location">
        <h3><span class="ds-icon">📍</span>작업장소</h3>
        <input class="edit-input" data-edit="location" type="text" value="${esc(d.location)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">📆</span>작업기간</h3>
        <input class="edit-input" data-edit="period" type="text" value="${esc(d.period)}">
      </div>
      <div class="detail-row-2">
        <div class="detail-section ds-workers">
          <h3><span class="ds-icon">👷</span>인원</h3>
          <input class="edit-input edit-input-sm" data-edit="workers" type="number" min="1" value="${esc(d.workers)}">
        </div>
        <div class="detail-section">
          <h3><span class="ds-icon">👔</span>현장책임자</h3>
          <input class="edit-input" data-edit="supervisor" type="text" value="${esc(d.supervisor)}">
        </div>
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">🚧</span>투입장비</h3>
        <input class="edit-input" data-edit="equipment" type="text" value="${esc(d.equipment)}">
      </div>
      <div class="detail-section ds-people">
        <h3><span class="ds-icon">👷</span>투입인원 명단</h3>
        <p class="edit-hint">한 줄에 한 명 · 직종 구분 시 <b>이름/직종</b> 형식 (예: 홍길동/용접공)</p>
        <textarea class="edit-textarea" data-edit="crew" rows="4">${esc(crewText)}</textarea>
      </div>
      <div class="detail-section ds-content">
        <h3><span class="ds-icon">📋</span>작업내용</h3>
        <textarea class="edit-textarea" data-edit="content" rows="3">${esc(d.content)}</textarea>
      </div>
      <div class="detail-section ds-hazard">
        <h3><span class="ds-icon">⚠️</span>위험요인</h3>
        <textarea class="edit-textarea" data-edit="hazards" rows="3">${esc(d.hazards)}</textarea>
      </div>
      <div class="detail-section ds-measure">
        <h3><span class="ds-icon">🛡️</span>안전대책</h3>
        <textarea class="edit-textarea" data-edit="measures" rows="3">${esc(d.measures)}</textarea>
      </div>`;
  },

  // ── 수정 폼 렌더 — 위험성평가 ─────────────────────────────
  _editFormRisk(d) {
    const esc = s => this.escapeHtml(s || '');
    return `
      <div class="edit-notice">✏️ 수정 모드 — 기본 정보만 수정 가능합니다</div>
      <div class="detail-section ds-date">
        <h3><span class="ds-icon">📅</span>평가일자</h3>
        <input class="edit-input" data-edit="date" type="date" value="${esc(d.date)}">
      </div>
      <div class="detail-section ds-name">
        <h3><span class="ds-icon">🔧</span>공종/작업명</h3>
        <input class="edit-input" data-edit="workName" type="text" value="${esc(d.workName)}">
      </div>
      <div class="detail-section ds-location">
        <h3><span class="ds-icon">📍</span>작업장소</h3>
        <input class="edit-input" data-edit="location" type="text" value="${esc(d.location)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">🏢</span>부서</h3>
        <input class="edit-input" data-edit="department" type="text" value="${esc(d.department)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">👔</span>평가자</h3>
        <input class="edit-input" data-edit="assessor" type="text" value="${esc(d.assessor)}">
      </div>
      <div class="detail-row-2">
        <div class="detail-section">
          <h3><span class="ds-icon">📅</span>개선예정일</h3>
          <input class="edit-input" data-edit="planDate" type="date" value="${esc(d.planDate)}">
        </div>
        <div class="detail-section">
          <h3><span class="ds-icon">✅</span>개선완료일</h3>
          <input class="edit-input" data-edit="completeDate" type="date" value="${esc(d.completeDate)}">
        </div>
      </div>`;
  },

  // ── 수정 폼 렌더 — 안전점검 ───────────────────────────────
  _editFormChecklist(d) {
    const esc = s => this.escapeHtml(s || '');
    const results = d.results || {};

    // 체크리스트 항목 렌더 (템플릿 기반)
    let checklistHtml = '';
    const tmpl = (typeof Checklist !== 'undefined') && d.typeCode && Checklist.templates[d.typeCode];
    if (tmpl && tmpl.categories) {
      Object.entries(tmpl.categories).forEach(([catName, items]) => {
        checklistHtml += `<div class="cl-edit-category">
          <div class="cl-edit-cat-title">${esc(catName)}</div>`;
        items.forEach(item => {
          const val = results[item] || 'unchecked';
          const passActive  = val === 'pass'  ? 'active-pass'  : '';
          const failActive  = val === 'fail'  ? 'active-fail'  : '';
          const naActive    = val === 'na'    ? 'active-na'    : '';
          checklistHtml += `
          <div class="cl-edit-item" data-item="${esc(item)}">
            <span class="cl-edit-item-name">${esc(item)}</span>
            <div class="cl-edit-btns">
              <button type="button" class="cl-edit-btn ${passActive}" data-val="pass"
                onclick="App._clEditToggle(this,'pass')">양호</button>
              <button type="button" class="cl-edit-btn ${failActive}" data-val="fail"
                onclick="App._clEditToggle(this,'fail')">불량</button>
              <button type="button" class="cl-edit-btn ${naActive}" data-val="na"
                onclick="App._clEditToggle(this,'na')">N/A</button>
            </div>
          </div>`;
        });
        checklistHtml += `</div>`;
      });
    }

    return `
      <div class="edit-notice">✏️ 수정 모드 — 내용을 변경 후 <b>수정 저장</b>을 눌러주세요</div>
      <div class="detail-section ds-date">
        <h3><span class="ds-icon">📅</span>점검일자</h3>
        <input class="edit-input" data-edit="date" type="date" value="${esc(d.date)}">
      </div>
      <div class="detail-section ds-location">
        <h3><span class="ds-icon">📍</span>점검장소</h3>
        <input class="edit-input" data-edit="location" type="text" value="${esc(d.location)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">👔</span>점검자</h3>
        <input class="edit-input" data-edit="inspector" type="text" value="${esc(d.inspector)}">
      </div>
      ${checklistHtml ? `
      <div class="detail-section">
        <h3><span class="ds-icon">✅</span>점검 항목</h3>
        <div class="cl-edit-list">${checklistHtml}</div>
      </div>` : ''}
      <div class="detail-section">
        <h3><span class="ds-icon">📝</span>종합의견</h3>
        <textarea class="edit-textarea" data-edit="opinion" rows="4">${esc(d.opinion)}</textarea>
      </div>`;
  },

  // 체크리스트 수정 모드 — 토글 버튼 핸들러
  _clEditToggle(btn, val) {
    const btns = btn.closest('.cl-edit-btns').querySelectorAll('.cl-edit-btn');
    btns.forEach(b => b.classList.remove('active-pass', 'active-fail', 'active-na'));
    const classMap = { pass: 'active-pass', fail: 'active-fail', na: 'active-na' };
    // 같은 버튼 재클릭 시 해제(unchecked)
    if (!btn.classList.contains(classMap[val])) {
      btn.classList.add(classMap[val]);
    }
  },

  // ── 수정 폼 렌더 — 사고보고서 ─────────────────────────────
  _editFormAccident(d) {
    const esc = s => this.escapeHtml(s || '');
    return `
      <div class="edit-notice">✏️ 수정 모드 — 내용을 변경 후 <b>수정 저장</b>을 눌러주세요</div>
      <div class="detail-row-2">
        <div class="detail-section ds-date">
          <h3><span class="ds-icon">📅</span>사고일자</h3>
          <input class="edit-input" data-edit="date" type="date" value="${esc(d.date)}">
        </div>
        <div class="detail-section">
          <h3><span class="ds-icon">🕐</span>사고시각</h3>
          <input class="edit-input" data-edit="time" type="time" value="${esc(d.time)}">
        </div>
      </div>
      <div class="detail-section ds-location">
        <h3><span class="ds-icon">📍</span>사고장소</h3>
        <input class="edit-input" data-edit="location" type="text" value="${esc(d.location)}">
      </div>
      <div class="detail-row-2">
        <div class="detail-section">
          <h3><span class="ds-icon">👤</span>보고자</h3>
          <input class="edit-input" data-edit="reporter" type="text" value="${esc(d.reporter)}">
        </div>
        <div class="detail-section">
          <h3><span class="ds-icon">🏢</span>소속</h3>
          <input class="edit-input" data-edit="department" type="text" value="${esc(d.department)}">
        </div>
      </div>
      <div class="detail-row-2">
        <div class="detail-section">
          <h3><span class="ds-icon">🤕</span>부상자 성명</h3>
          <input class="edit-input" data-edit="injuredName" type="text" value="${esc(d.injuredName)}">
        </div>
        <div class="detail-section">
          <h3><span class="ds-icon">ℹ️</span>나이/소속</h3>
          <input class="edit-input" data-edit="injuredInfo" type="text" value="${esc(d.injuredInfo)}">
        </div>
      </div>
      <div class="detail-row-2">
        <div class="detail-section">
          <h3><span class="ds-icon">🩹</span>부상부위</h3>
          <input class="edit-input" data-edit="injuredPart" type="text" value="${esc(d.injuredPart)}">
        </div>
        <div class="detail-section">
          <h3><span class="ds-icon">📊</span>부상정도</h3>
          <input class="edit-input" data-edit="injuredLevel" type="text" value="${esc(d.injuredLevel)}">
        </div>
      </div>
      <div class="detail-section ds-hazard">
        <h3><span class="ds-icon">⚠️</span>사고 경위</h3>
        <textarea class="edit-textarea" data-edit="content" rows="4">${esc(d.content)}</textarea>
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">🔍</span>사고 원인</h3>
        <textarea class="edit-textarea" data-edit="cause" rows="3">${esc(d.cause)}</textarea>
      </div>
      <div class="detail-section ds-measure">
        <h3><span class="ds-icon">🚨</span>즉시조치</h3>
        <textarea class="edit-textarea" data-edit="immediateAction" rows="3">${esc(d.immediateAction)}</textarea>
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">🛡️</span>재발방지대책</h3>
        <textarea class="edit-textarea" data-edit="preventionPlan" rows="3">${esc(d.preventionPlan)}</textarea>
      </div>`;
  },

  // ── 수정 폼 렌더 — 작업허가서 ─────────────────────────────
  _editFormPTW(d) {
    const esc = s => this.escapeHtml(s || '');
    return `
      <div class="edit-notice">✏️ 수정 모드 — 기본 정보와 메모만 수정 가능합니다<br><span style="font-size:11px;opacity:0.8">※ 서명·체크항목은 원본 유지</span></div>
      <div class="detail-section ds-date">
        <h3><span class="ds-icon">📅</span>신청일자</h3>
        <input class="edit-input" data-edit="date" type="date" value="${esc(d.date)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">🏢</span>신청부서/업체명</h3>
        <input class="edit-input" data-edit="company" type="text" value="${esc(d.company)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">👔</span>신청자</h3>
        <input class="edit-input" data-edit="requestorName" type="text" value="${esc(d.requestorName)}">
      </div>
      <div class="detail-section ds-content">
        <h3><span class="ds-icon">📋</span>작업내용</h3>
        <textarea class="edit-textarea" data-edit="workName" rows="3">${esc(d.workName)}</textarea>
      </div>
      <div class="detail-section ds-location">
        <h3><span class="ds-icon">📍</span>작업장소</h3>
        <input class="edit-input" data-edit="location" type="text" value="${esc(d.location)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">👷</span>작업인원</h3>
        <input class="edit-input edit-input-sm" data-edit="workers" type="text" value="${esc(d.workers)}">
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">📝</span>요청사항</h3>
        <textarea class="edit-textarea" data-edit="requestNotes" rows="3">${esc(d.requestNotes)}</textarea>
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">✅</span>확인 메모</h3>
        <textarea class="edit-textarea" data-edit="checkerMemo" rows="2">${esc(d.checkerMemo)}</textarea>
      </div>
      <div class="detail-section">
        <h3><span class="ds-icon">🔐</span>허가 내용</h3>
        <textarea class="edit-textarea" data-edit="permitContent" rows="2">${esc(d.permitContent)}</textarea>
      </div>`;
  },

  renderTBMDetail(d) {
    const photosHtml = (d.photos||[]).length
      ? `<div class="detail-photo-grid">${
          (d.photos||[]).map((p,i) =>
            `<div class="detail-photo-thumb" onclick="App._viewPhoto('${p}')">
               <img src="${p}" alt="현장사진 ${i+1}">
             </div>`
          ).join('')
        }</div>`
      : '<p style="color:var(--gray-400);font-size:13px">첨부된 사진 없음</p>';

    const participantList = (d.participants||[]).map(p => this.escapeHtml(p));
    const participantsHtml = participantList.length
      ? `<div class="detail-participants">${
          participantList.map(p => `<span class="detail-participant-chip">${p}</span>`).join('')
        }</div>`
      : '<span class="detail-empty">참석자 없음</span>';

    return `
      <div class="detail-section ds-date">
        <h3><span class="ds-icon">📅</span>작업일자</h3>
        <p>${this.formatDate(d.date)}</p>
      </div>
      <div class="detail-section ds-name">
        <h3><span class="ds-icon">🔧</span>공종/작업명</h3>
        <p>${this.escapeHtml(d.workName)}</p>
      </div>
      <div class="detail-row-2">
        <div class="detail-section ds-location">
          <h3><span class="ds-icon">📍</span>작업장소</h3>
          <p>${this.escapeHtml(d.location)}</p>
        </div>
        <div class="detail-section ds-workers">
          <h3><span class="ds-icon">👷</span>작업인원</h3>
          <p>${d.workers}<span style="font-size:13px;color:var(--gray-500)">명</span></p>
        </div>
      </div>
      <div class="detail-section ds-content">
        <h3><span class="ds-icon">📋</span>작업내용</h3>
        <p>${this.escapeHtml(d.content)}</p>
      </div>
      <div class="detail-section ds-hazard">
        <h3><span class="ds-icon">⚠️</span>위험요인</h3>
        <p>${this.escapeHtml(d.hazards)}</p>
      </div>
      <div class="detail-section ds-measure">
        <h3><span class="ds-icon">🛡️</span>안전대책</h3>
        <p>${this.escapeHtml(d.measures)}</p>
      </div>
      ${d.instructions ? `
      <div class="detail-section ds-instruction">
        <h3><span class="ds-icon">📣</span>특별 지시사항</h3>
        <p>${this.escapeHtml(d.instructions)}</p>
      </div>` : ''}
      <div class="detail-section ds-people">
        <h3><span class="ds-icon">👥</span>참석자</h3>
        ${participantsHtml}
      </div>
      <div class="detail-section ds-supervisor">
        <h3><span class="ds-icon">👔</span>관리감독자</h3>
        <p>${this.escapeHtml(d.supervisor)}</p>
      </div>
      <div class="detail-section ds-photo">
        <h3>
          <span class="ds-icon">📷</span>현장사진
          <span class="ds-count-badge">${(d.photos||[]).length}장</span>
        </h3>
        ${photosHtml}
      </div>
    `;
  },

  renderRiskDetail(d) {
    const lvCls  = lv => lv==='상'?'rl-high':lv==='중'?'rl-med':'rl-low';
    const lvDesc = lv => lv==='상'?'즉시개선':lv==='중'?'개선필요':'허용가능';

    const itemsHtml = (d.items||[]).map((item, i) => {
      let riskBadge = '';
      let afterBadge = '';

      if (item.riskLevel) {
        // ── 개선 전 배지 ──
        riskBadge = `
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:11px;color:#888">📋 개선 전</span>
            <span style="display:inline-block;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700" class="${lvCls(item.riskLevel)}">
              ${item.riskLevel} (${lvDesc(item.riskLevel)})
            </span>
            <span style="font-size:11px;color:var(--gray-500)">가능성:${item.probability} × 심각도:${item.severity}</span>
          </div>`;

        // ── 개선 후 배지 (저장된 경우만) ──
        if (item.afterRiskLevel) {
          const arrow = item.afterRiskLevel !== item.riskLevel ? ' ↓' : ' →';
          afterBadge = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-size:11px;color:#2e7d32;font-weight:600">✅ 개선 후</span>
              <span style="display:inline-block;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700" class="${lvCls(item.afterRiskLevel)}">
                ${item.afterRiskLevel}${arrow} (${lvDesc(item.afterRiskLevel)})
              </span>
              <span style="font-size:11px;color:var(--gray-500)">가능성:${item.afterProbability} × 심각도:${item.severity}(고정)</span>
            </div>`;
        }
      } else if (item.frequency !== undefined) {
        // 구버전 호환
        const score = item.frequency * item.severity;
        const lvl   = score>=12?'high':score>=6?'medium':'low';
        riskBadge = `<span class="risk-level ${lvl}">${score}점</span>
          <span style="font-size:12px;color:var(--gray-500);margin-left:4px">빈도(${item.frequency})×강도(${item.severity})</span>`;
      }

      const thumbStyle = 'position:relative;border-radius:6px;overflow:hidden;background:var(--gray-100);cursor:zoom-in';
      const makePhotosHtml = (photos, label, labelColor) => {
        if (!photos || !photos.length) return '';
        const thumbs = photos.map(p =>
          `<div style="${thumbStyle}" onclick="App._viewPhoto('${p.data.replace(/'/g, "\\'")}')">
            <div style="padding-top:100%"></div>
            <img src="${p.data}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover">
          </div>`
        ).join('');
        return `<div style="margin-top:8px">
          <div style="font-size:11px;font-weight:700;color:${labelColor};margin-bottom:4px">${label}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${thumbs}</div>
        </div>`;
      };
      const beforePhotosHtml = makePhotosHtml(item.beforePhotos, '📷 개선 전 사진', '#888');
      const afterPhotosHtml  = makePhotosHtml(item.afterPhotos,  '✅ 개선 후 사진', '#2e7d32');

      return `<div style="background:var(--gray-50);padding:12px;border-radius:8px;margin-bottom:8px;border-left:3px solid ${item.afterRiskLevel && item.afterRiskLevel !== item.riskLevel ? '#66bb6a' : '#e0e0e0'}">
        <p style="font-weight:600;margin-bottom:8px">#${i+1}. ${this.escapeHtml(item.hazard)}</p>
        ${riskBadge}${beforePhotosHtml}${afterBadge}${afterPhotosHtml}
        <p style="font-size:13px;color:var(--gray-700);margin-top:6px">📌 대책: ${this.escapeHtml(item.countermeasure)}</p>
      </div>`;
    }).join('');

    const methodBadge = d.method === '상중하'
      ? `<span style="font-size:11px;background:#e3f2fd;color:#1565c0;padding:2px 8px;border-radius:8px;font-weight:600">상중하 평가법</span>`
      : '';

    // ── 개선 일정 섹션 ──
    let improveSectionHtml = '';
    if (d.planDate || d.completeDate) {
      const today = new Date().toISOString().split('T')[0];
      const statusMap = {
        '완료':    { cls:'improve-status-done',    icon:'✅', label:'개선 완료' },
        '완료예정': { cls:'improve-status-planned',  icon:'📅', label:'완료 예정' },
        '진행중':  { cls:'improve-status-ongoing',  icon:'🔄', label:'진행 중'  },
        '지연':    { cls:'improve-status-overdue',  icon:'⚠️', label:'지연'    },
        '미설정':  { cls:'improve-status-none',     icon:'–',  label:'미설정'  }
      };
      const st = statusMap[d.improveStatus] || statusMap['미설정'];

      // D-Day 계산
      let ddayHtml = '';
      if (d.planDate) {
        const diffMs = new Date(d.planDate) - new Date(today);
        const diff   = Math.round(diffMs / 86400000);
        const ddayStr = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
        const ddayCls = diff < 0 ? 'color:#c62828' : diff <= 3 ? 'color:#e65100' : 'color:#1a73e8';
        ddayHtml = `<span style="font-size:12px;font-weight:700;${ddayCls};margin-left:8px">${ddayStr}</span>`;
      }

      improveSectionHtml = `
        <div class="detail-section">
          <h3>개선 일정</h3>
          <div class="improve-schedule-card">
            <div class="improve-schedule-row">
              <span class="improve-sch-label">📅 개선예정일</span>
              <span class="improve-sch-value">${d.planDate ? this.formatDate(d.planDate) : '—'}${ddayHtml}</span>
            </div>
            <div class="improve-schedule-row">
              <span class="improve-sch-label">✅ 개선완료일</span>
              <span class="improve-sch-value">${d.completeDate ? this.formatDate(d.completeDate) : '—'}</span>
            </div>
            <div class="improve-schedule-row">
              <span class="improve-sch-label">진행 상태</span>
              <span class="improve-status-badge ${st.cls}">${st.icon} ${st.label}</span>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="detail-section"><h3>평가일자</h3><p>${this.formatDate(d.date)} ${methodBadge}</p></div>
      ${improveSectionHtml}
      <div class="detail-section"><h3>작업명</h3><p>${this.escapeHtml(d.workName)}</p></div>
      <div class="detail-section"><h3>작업장소</h3><p>${this.escapeHtml(d.location)}</p></div>
      <div class="detail-section"><h3>위험요인 목록</h3>${itemsHtml}</div>
      <div class="detail-section"><h3>평가자</h3><p>${this.escapeHtml(d.assessor)}</p></div>
    `;
  },

  renderChecklistDetail(d) {
    const resultsHtml = Object.entries(d.results||{}).map(([key,val]) => {
      const txt   = val==='pass'?'양호':val==='fail'?'불량':'N/A';
      const color = val==='pass'?'var(--success)':val==='fail'?'var(--danger)':'var(--gray-500)';
      return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100)">
        <span>${this.escapeHtml(key)}</span>
        <span style="color:${color};font-weight:600">${txt}</span>
      </div>`;
    }).join('');
    return `
      <div class="detail-section"><h3>점검일자</h3><p>${this.formatDate(d.date)}</p></div>
      <div class="detail-section"><h3>점검유형</h3><p>${this.escapeHtml(d.type)}</p></div>
      <div class="detail-section"><h3>점검장소</h3><p>${this.escapeHtml(d.location)}</p></div>
      <div class="detail-section"><h3>점검결과</h3>${resultsHtml}</div>
      ${d.opinion?`<div class="detail-section"><h3>종합의견</h3><p>${this.escapeHtml(d.opinion)}</p></div>`:''}
      <div class="detail-section"><h3>점검자</h3><p>${this.escapeHtml(d.inspector)}</p></div>
    `;
  },

  renderWorkPlanDetail(d) {
    const statusMap = { submitted:'신청', approved:'승인', rejected:'반려' };
    const statusColor = { submitted:'var(--primary)', approved:'var(--success)', rejected:'var(--danger)' };
    const st = d.status || 'submitted';
    return `
      <div class="detail-status-bar" style="background:${statusColor[st]||'var(--primary)'}">
        ${statusMap[st]||st}
      </div>
      <div class="detail-section"><h3>작성일자</h3><p>${this.formatDate(d.date)}</p></div>
      <div class="detail-section"><h3>업체명</h3><p>${this.escapeHtml(d.company)}</p></div>
      <div class="detail-section"><h3>작업명</h3><p>${this.escapeHtml(d.workName)}</p></div>
      <div class="detail-section"><h3>작업장소</h3><p>${this.escapeHtml(d.location)}</p></div>
      <div class="detail-section"><h3>작업기간</h3><p>${this.escapeHtml(d.period)}</p></div>
      <div class="detail-section"><h3>작업인원</h3><p>${this.escapeHtml(d.workers)}명</p></div>
      <div class="detail-section"><h3>현장책임자</h3><p>${this.escapeHtml(d.supervisor)}</p></div>
      ${d.equipment?`<div class="detail-section"><h3>투입장비</h3><p>${this.escapeHtml(d.equipment)}</p></div>`:''}
      ${(d.crew && d.crew.length) ? `
      <div class="detail-section ds-people">
        <h3><span class="ds-icon">👷</span>투입인원 명단
          <span class="ds-count-badge">${d.crew.length}명</span>
        </h3>
        <div class="wp-detail-crew-table">
          <div class="wp-detail-crew-head">
            <span>No.</span><span>성명</span><span>직종·역할</span>
          </div>
          ${d.crew.map((c,i) => `
            <div class="wp-detail-crew-row">
              <span class="wp-crew-no">${i+1}</span>
              <span class="wp-crew-name">${this.escapeHtml(c.name)}</span>
              <span class="wp-crew-role">${this.escapeHtml(c.role)||'—'}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
      <div class="detail-section"><h3>작업내용</h3><p>${this.escapeHtml(d.content)}</p></div>
      <div class="detail-section"><h3>위험요인</h3><p>${this.escapeHtml(d.hazards)}</p></div>
      <div class="detail-section"><h3>안전대책</h3><p>${this.escapeHtml(d.measures)}</p></div>
      ${(() => {
        // 신버전: photos[] 배열 / 구버전: tbmPhoto 단일
        const imgs = (d.photos && d.photos.length) ? d.photos
                   : (d.tbmPhoto ? [d.tbmPhoto] : []);
        if (!imgs.length) return '';
        return `<div class="detail-section ds-photo">
          <h3><span class="ds-icon">📷</span>현장사진
            <span class="ds-count-badge">${imgs.length}장</span>
          </h3>
          <div class="detail-photo-grid">${
            imgs.map((p,i) =>
              `<div class="detail-photo-thumb" onclick="App._viewPhoto('${p}')">
                <img src="${p}" alt="현장사진 ${i+1}">
              </div>`
            ).join('')
          }</div>
        </div>`;
      })()}
      ${d.supervisorSignature ? `<div class="detail-section"><h3>책임자 서명</h3><img src="${d.supervisorSignature}" style="max-width:200px;border:1px solid var(--gray-200);border-radius:4px"></div>` : ''}
    `;
  },

  renderPTWDetail(d) {
    const statusMap   = { submitted:'신청', reviewing:'검토 중', approved:'허가 완료', rejected:'반려' };
    const statusColor = { submitted:'var(--primary)', reviewing:'var(--warning)', approved:'var(--success)', rejected:'var(--danger)' };
    const st = d.status || 'submitted';

    const typeLabels = (d.workTypeLabels || d.workTypes || []).join(', ');

    const checkHtml = (() => {
      const entries = Object.entries(d.checkResults || {});
      if (!entries.length) return '<p style="color:var(--gray-500);font-size:13px">-</p>';
      const byType = {};
      entries.forEach(([k, v]) => {
        const lastU = k.lastIndexOf('_');
        const tk = k.substring(0, lastU);
        const idx = parseInt(k.substring(lastU + 1));
        if (!byType[tk]) byType[tk] = [];
        byType[tk].push({ idx, v });
      });
      return Object.entries(byType).map(([tk, items]) => {
        const cl = (typeof PTW !== 'undefined') ? PTW.checklists[tk] : null;
        const typeLabel = cl ? cl.label : tk;
        const rows = items.sort((a, b) => a.idx - b.idx).map(({ idx, v }) => {
          const result = v === 'pass' ? '✅ 적합' : v === 'fail' ? '❌ 부적합' : '— N/A';
          const itemName = cl && cl.items[idx] ? cl.items[idx] : `항목 ${idx + 1}`;
          return `<div style="display:flex;justify-content:space-between;padding:4px 0 4px 8px;border-bottom:1px solid var(--gray-100);font-size:13px">
            <span style="color:var(--gray-700)">${this.escapeHtml(itemName)}</span><span style="white-space:nowrap;margin-left:8px">${result}</span>
          </div>`;
        }).join('');
        return `<div style="font-size:12px;font-weight:700;color:var(--primary);margin-top:8px;margin-bottom:2px">${this.escapeHtml(typeLabel)}</div>${rows}`;
      }).join('');
    })();

    return `
      <div class="detail-status-bar" style="background:${statusColor[st]||'var(--primary)'}">
        ${statusMap[st]||st}
      </div>
      <div class="detail-section"><h3>작업허가 일자</h3><p>${this.formatDate(d.date)}</p></div>
      <div class="detail-section"><h3>작업유형</h3><p>${this.escapeHtml(typeLabels)}</p></div>
      <div class="detail-section"><h3>신청부서/업체</h3><p>${this.escapeHtml(d.company)}</p></div>
      <div class="detail-section"><h3>신청자</h3><p>${this.escapeHtml(d.position)} ${this.escapeHtml(d.requestorName)}</p></div>
      <div class="detail-section"><h3>작업내용</h3><p>${this.escapeHtml(d.workName)}</p></div>
      <div class="detail-section"><h3>작업장소</h3><p>${this.escapeHtml(d.location)}</p></div>
      <div class="detail-section"><h3>작업기간</h3><p>${this.formatDateTime(d.periodStart)} ~ ${this.formatDateTime(d.periodEnd)}</p></div>
      ${d.equipment?`<div class="detail-section"><h3>투입장비</h3><p>${this.escapeHtml(d.equipment)}</p></div>`:''}
      <div class="detail-section"><h3>사전 체크결과</h3>${checkHtml}</div>
      ${d.requestNotes?`<div class="detail-section"><h3>요청사항</h3><p>${this.escapeHtml(d.requestNotes)}</p></div>`:''}
      ${d.requestorSignature?`<div class="detail-section"><h3>신청자 서명</h3><img src="${d.requestorSignature}" style="max-width:200px;border:1px solid var(--gray-200);border-radius:4px"></div>`:''}
      <div class="detail-section" style="background:var(--gray-50);padding:12px;border-radius:8px">
        <h3>확인 결과</h3>
        <p>${this.escapeHtml(d.checkerDept)} ${this.escapeHtml(d.checkerName)} — ${d.checkerResult==='ok'?'✅ 이상없음':d.checkerResult==='conditional'?'⚠️ 보완 후 작업':'-'}</p>
        ${d.checkerMemo?`<p style="font-size:13px;color:var(--gray-600);margin-top:4px">${this.escapeHtml(d.checkerMemo)}</p>`:''}
        ${d.checkerSignature?`<img src="${d.checkerSignature}" style="max-width:180px;margin-top:8px;border:1px solid var(--gray-200);border-radius:4px">`:''}
      </div>
      <div class="detail-section" style="background:var(--success-light);padding:12px;border-radius:8px">
        <h3>허가</h3>
        <p>${this.escapeHtml(d.approverDept)} ${this.escapeHtml(d.approverName)}</p>
        ${d.permitContent?`<p style="font-size:13px;margin-top:4px">${this.escapeHtml(d.permitContent)}</p>`:''}
        ${d.approverSignature?`<img src="${d.approverSignature}" style="max-width:180px;margin-top:8px;border:1px solid var(--gray-200);border-radius:4px">`:''}
      </div>
    `;
  },

  renderAccidentDetail(d) {
    const typeColors = {
      nearmiss:   '#f9ab00', safety:    '#e65100',
      industrial: '#d93025', serious:   '#6a1b9a'
    };
    const color = typeColors[d.accidentType] || 'var(--danger)';
    const isInjury = d.accidentType !== 'nearmiss';

    const photosHtml = (d.photos||[]).length
      ? `<div class="detail-photo-grid">${
          (d.photos||[]).map(p =>
            `<div class="detail-photo-thumb" onclick="App._viewPhoto('${p}')">
               <img src="${p}" alt="현장사진">
             </div>`
          ).join('')
        }</div>`
      : '<p style="color:var(--gray-500);font-size:13px">첨부된 사진 없음</p>';

    return `
      <div class="detail-status-bar" style="background:${color}">
        ${this.escapeHtml(d.accidentTypeLabel || d.accidentType)}
      </div>
      <div class="detail-section"><h3>📅 발생일자 / 시간</h3>
        <p>${this.formatDate(d.date)}${d.time ? ' ' + d.time : ''}</p></div>
      <div class="detail-section"><h3>📍 발생장소</h3><p>${this.escapeHtml(d.location)}</p></div>
      <div class="detail-section"><h3>👤 보고자 / 소속</h3>
        <p>${this.escapeHtml(d.reporter)||'-'} / ${this.escapeHtml(d.department)||'-'}</p></div>
      <div class="detail-section"><h3>📝 사고경위</h3><p style="white-space:pre-wrap">${this.escapeHtml(d.content)}</p></div>
      ${d.cause ? `<div class="detail-section"><h3>🔍 추정원인</h3><p style="white-space:pre-wrap">${this.escapeHtml(d.cause)}</p></div>` : ''}
      ${isInjury && (d.injuredName||d.injuredPart) ? `
        <div class="detail-section" style="background:#fce8e6;padding:12px;border-radius:8px">
          <h3>🤕 부상자 정보</h3>
          ${d.injuredName ? `<p><strong>${this.escapeHtml(d.injuredName)}</strong> (${this.escapeHtml(d.injuredInfo)})</p>` : ''}
          ${d.injuredPart ? `<p style="font-size:13px;margin-top:4px">부상부위: ${this.escapeHtml(d.injuredPart)} / 정도: ${this.escapeHtml(d.injuredLevel)}</p>` : ''}
        </div>` : ''}
      ${d.immediateAction ? `<div class="detail-section"><h3>✅ 즉시조치</h3><p style="white-space:pre-wrap">${this.escapeHtml(d.immediateAction)}</p></div>` : ''}
      ${d.preventionPlan  ? `<div class="detail-section"><h3>📌 재발방지대책</h3><p style="white-space:pre-wrap">${this.escapeHtml(d.preventionPlan)}</p></div>` : ''}
      <div class="detail-section">
        <h3>📷 현장사진 <span style="font-weight:400;font-size:13px;color:var(--gray-500)">(${(d.photos||[]).length}장)</span></h3>
        ${photosHtml}
      </div>
      ${d.reporterSignature ? `<div class="detail-section"><h3>✍️ 보고자 서명</h3>
        <img src="${d.reporterSignature}" style="max-width:200px;border:1px solid var(--gray-200);border-radius:4px"></div>` : ''}
    `;
  },

  // 사진 전체화면 뷰어
  _viewPhoto(src) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:16px';
    overlay.innerHTML = `<img src="${src}" style="max-width:100%;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">`;
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  },

  // ── dataURL → canvas 재압축 (공유용 소형화) ─────────────
  _compressForShare(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
          else        { w = Math.round(w * MAX / h); h = MAX; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.70));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  // ── dataURL → File (ASCII 파일명 강제) ──────────────────
  _makeFile(dataUrl, filename) {
    try {
      const comma = dataUrl.indexOf(',');
      if (comma < 0) return null;
      const mime  = dataUrl.slice(5, dataUrl.indexOf(';'));
      const bstr  = atob(dataUrl.slice(comma + 1));
      const buf   = new ArrayBuffer(bstr.length);
      const view  = new Uint8Array(buf);
      for (let i = 0; i < bstr.length; i++) view[i] = bstr.charCodeAt(i);
      // 파일명은 반드시 ASCII만 (한글·특수문자 제거)
      const safe  = filename.replace(/[^\w.\-]/g, '_');
      return new File([buf], safe, { type: mime || 'image/jpeg', lastModified: Date.now() });
    } catch(e) {
      console.warn('[share] _makeFile 실패:', e);
      return null;
    }
  },

  // ── 레코드에서 사진 File[] 비동기 추출 (압축 포함) ──────
  async _extractPhotosForShare(type, d) {
    const raws = [];
    if (type === 'accident') {
      (d.photos || []).forEach((p, i) => raws.push({ data: p, name: `acc_photo_${i+1}.jpg` }));
    } else if (type === 'tbm') {
      (d.photos || []).forEach((p, i) => raws.push({ data: p, name: `tbm_photo_${i+1}.jpg` }));
    } else if (type === 'workplan' && d.tbmPhoto) {
      raws.push({ data: d.tbmPhoto, name: 'tbm_photo.jpg' });
    }
    if (!raws.length) return [];

    const files = [];
    for (const { data, name } of raws) {
      try {
        const compressed = await this._compressForShare(data);
        const f = this._makeFile(compressed, name);
        if (f) files.push(f);
      } catch(e) {
        console.warn('[share] 사진 처리 실패:', name, e);
      }
    }
    return files;
  },

  // ── 상세보기 화면 캡처 → 이미지 공유 ────────────────────
  async captureDetail() {
    if (!this._detailData) { this.showToast('캡처할 내용이 없습니다.'); return; }
    if (typeof html2canvas === 'undefined') {
      this.showToast('캡처 라이브러리 로딩 실패'); return;
    }

    const btn = document.getElementById('btn-capture-detail');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ 캡처 중...';
    this.showToast('📸 화면 캡처 중...');

    try {
      const target = document.getElementById('detail-content');

      // html2canvas 캡처 옵션
      const canvas = await html2canvas(target, {
        scale: 2,                        // 고해상도 (Retina / Android 고밀도)
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8f9fa',
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        // 헤더/바텀바 제외하고 detail-content만 캡처
        x: 0,
        y: 0,
        width:  target.offsetWidth,
        height: target.scrollHeight
      });

      // 상단 워터마크 추가
      const ctx = canvas.getContext('2d');
      const barH = 52;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newCanvas = document.createElement('canvas');
      newCanvas.width  = canvas.width;
      newCanvas.height = canvas.height + barH * 2;
      const nc = newCanvas.getContext('2d');

      // 워터마크 상단 바
      nc.fillStyle = '#1a73e8';
      nc.fillRect(0, 0, newCanvas.width, barH * 2);
      // 로고 텍스트
      nc.fillStyle = '#ffffff';
      nc.font = `bold ${barH * 0.55}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
      nc.textBaseline = 'middle';
      nc.fillText('🛡 SAMHWA SafeOn', 16 * 2, barH);
      // 날짜
      nc.font = `${barH * 0.38}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
      nc.fillStyle = 'rgba(255,255,255,0.8)';
      const now = new Date();
      nc.fillText(
        `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
        16 * 2,
        barH + barH * 0.5
      );
      // 원본 캡처 이미지 붙이기
      nc.putImageData(imgData, 0, barH * 2);

      // Canvas → Blob
      const blob = await new Promise(resolve =>
        newCanvas.toBlob(resolve, 'image/png', 0.95)
      );

      const title = this._detailTitle(this._detailType, this._detailData) || 'SafeOn';
      const fileName = `SafeOn_${title.replace(/[\s\/\\:*?"<>|]/g,'_')}_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Web Share API Level 2 (이미지 파일 직접 공유 — Android Chrome 지원)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `SAMHWA SafeOn — ${title}`,
          text: title
        });
        this.showToast('📸 캡처 이미지 공유 완료 ✓');
      } else {
        // 폴백: 이미지 파일로 다운로드
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        this.showToast('📥 이미지 저장 완료 — 갤러리에서 확인하세요');
      }
    } catch (err) {
      console.error('[captureDetail]', err);
      this.showToast('캡처 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  },

  // ── 사진 → 갤러리/다운로드 저장 ────────────────────────
  _savePhotos(photos) {
    if (!photos.length) return;
    photos.forEach((file, i) => {
      setTimeout(() => {
        const url = URL.createObjectURL(file);
        const a   = document.createElement('a');
        a.href = url; a.download = file.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      }, i * 350);
    });
  },

  // ── 공유 실행 엔진 ───────────────────────────────────────
  // 카카오톡 등 대부분의 메신저 앱은 Web Share API 파일 첨부를
  // 지원하지 않으므로, 사진은 갤러리에 먼저 저장하고
  // 텍스트만 공유시트로 전송합니다.
  async _doShare({ title, text, photos = [] }) {

    // ── STEP 1. 사진이 있으면 갤러리에 먼저 저장 ──────────
    if (photos.length) {
      this._savePhotos(photos);
      // 저장 시작 후 약간 대기 (브라우저 다운로드 트리거 안정화)
      await new Promise(r => setTimeout(r, 300));
    }

    // ── STEP 2. 텍스트 공유 (Web Share API) ───────────────
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        if (photos.length) {
          App.showToast(`📥 사진 ${photos.length}장 저장됨 — 카카오톡에서 직접 첨부하세요`);
        } else {
          App.showToast('공유 완료 ✓');
        }
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;   // 사용자가 취소
        console.warn('[share] navigator.share 실패:', e.message);
      }
    }

    // ── STEP 3. PC / 미지원 → 클립보드 복사 폴백 ─────────
    try {
      await navigator.clipboard.writeText(text);
      if (photos.length) {
        App.showToast(`📋 복사됨 + 📥 사진 ${photos.length}장 저장됨`);
      } else {
        App.showToast('클립보드에 복사됨 📋');
      }
    } catch {
      App.showToast('클립보드 복사 실패 — 직접 복사해 주세요');
    }
  },

  // ── 상세보기 인쇄/PDF ────────────────────────────────────
  printDetail() {
    if (!this._detailData) { this.showToast('출력할 내용이 없습니다.'); return; }
    const typeLabel = { tbm:'TBM', risk:'위험성평가', checklist:'안전점검', workplan:'작업계획서', ptw:'작업허가서' };
    const title = this._detailTitle(this._detailType, this._detailData);
    const bodyHtml = document.getElementById('detail-content').innerHTML;

    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
      <div style="font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:13px;color:#202124;padding:20px;max-width:800px;margin:0 auto">
        <div style="display:flex;align-items:center;gap:10px;border-bottom:2px solid #1a73e8;padding-bottom:10px;margin-bottom:16px">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#1a73e8,#0d47a1);border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#0d47a1">SAMHWA SafeOn</div>
            <div style="font-size:11px;color:#5f6368">[${typeLabel[this._detailType]||this._detailType}] ${title}</div>
          </div>
          <div style="margin-left:auto;font-size:11px;color:#5f6368;text-align:right">
            출력: ${new Date().toLocaleString('ko-KR')}
          </div>
        </div>
        ${bodyHtml}
        <div style="margin-top:20px;padding-top:8px;border-top:1px solid #e8eaed;font-size:10px;color:#9aa0a6;text-align:right">
          SAMHWA SafeOn 현장 안전보건 관리 시스템
        </div>
      </div>`;

    setTimeout(() => {
      window.print();
      setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }, 150);
  },

  // ── 텍스트 표 생성 유틸 ──────────────────────────────────
  // 한글/CJK 2칸, ASCII 1칸, 이모지 2칸으로 너비 계산 후 박스 그리기
  _textTable(headers, rows) {
    const strW = str => [...String(str||'')].reduce((w, ch) => {
      const cp = ch.codePointAt(0);
      if (cp >= 0xAC00 && cp <= 0xD7A3) return w + 2;  // 한글 완성형
      if (cp >= 0x1100 && cp <= 0x11FF) return w + 2;  // 한글 자모
      if (cp >= 0x3000 && cp <= 0x9FFF) return w + 2;  // CJK
      if (cp >= 0x1F300)                return w + 2;  // 이모지
      return w + 1;
    }, 0);
    const padR = (s, n) => { s = String(s||''); return s + ' '.repeat(Math.max(0, n - strW(s))); };
    const allRows = [headers, ...rows];
    const cols = headers.map((_, i) => Math.max(...allRows.map(r => strW(String(r[i]||'')))));
    const bar  = (l, m, r) => l + cols.map(w => '─'.repeat(w + 2)).join(m) + r;
    const line = cells => '│' + cells.map((c, i) => ' ' + padR(String(c||''), cols[i]) + ' ').join('│') + '│';
    return [bar('┌','┬','┐'), line(headers), bar('├','┼','┤'), ...rows.map(line), bar('└','┴','┘')].join('\n');
  },

  // 긴 텍스트 말줄임 (표 안 값용)
  _trunc(s, n) { s = String(s||''); return s.length > n ? s.slice(0, n-1) + '…' : s; },

  // ── 타입별 상세 텍스트 변환 (표 형식) ──────────────────────
  _detailTitle(type, d) {
    if (type === 'tbm')       return d.workName || 'TBM';
    if (type === 'risk')      return d.workName || '위험성평가';
    if (type === 'checklist') return d.type     || '안전점검';
    if (type === 'workplan')  return d.workName || '작업계획서';
    if (type === 'ptw')       return d.workName || '작업허가서';
    if (type === 'accident')  return `[${d.accidentTypeLabel||d.accidentType||'사고'}] ${d.location||''}`;
    return '';
  },

  _detailToText(type, d) {
    const TYPE_ICON = {tbm:'🦺',risk:'⚠️',checklist:'✅',workplan:'📋',ptw:'🔑',accident:'🚨',nearmiss:'⚡'};
    const TYPE_KO   = {tbm:'TBM',risk:'위험성평가',checklist:'안전점검',workplan:'작업계획서',ptw:'작업허가서',accident:'사고보고서',nearmiss:'아차사고'};
    const dispType  = (type === 'accident' && d.accidentType === 'nearmiss') ? 'nearmiss' : type;
    const HDR = `${TYPE_ICON[dispType]||'📋'} SAMHWA SafeOn — ${TYPE_KO[dispType]||type}`;
    const DIV = '─'.repeat(34);
    const tbl = (rows) => this._textTable(['항목','내용'], rows);
    const tr  = (s) => this._trunc(s, 24);

    // ── TBM ──────────────────────────────────────────────────
    if (type === 'tbm') {
      const rows = [
        ['📅 작업일자',   this.formatDate(d.date)],
        ['🏗️ 공종/작업명', tr(d.workName)],
        ['📍 작업장소',   tr(d.location)],
        ['👥 작업인원',   (d.workers||0)+'명'],
        ['📝 작업내용',   tr(d.content)],
        ['⚠️ 위험요인',   tr(d.hazards)],
        ['🛡️ 안전대책',   tr(d.measures)],
        ['📢 특별지시',   tr(d.instructions)],
        ['👷 참석자',     tr((d.participants||[]).join(', '))],
        ['👔 관리감독자', tr(d.supervisor)],
        ['✍️ 서명',       d.supervisorSignature ? '✅ 완료' : '⬜ 없음'],
      ].filter(([,v]) => v && v !== 'undefined' && v !== '0명');
      return `${HDR}\n${DIV}\n${tbl(rows)}\n${DIV}`;
    }

    // ── 위험성평가 ────────────────────────────────────────────
    if (type === 'risk') {
      const infoRows = [
        ['📅 평가일자', this.formatDate(d.date)],
        ['🏗️ 작업명',   tr(d.workName)],
        ['📍 작업장소', tr(d.location)],
        ['👤 평가자',   tr(d.assessor)],
      ].filter(([,v]) => v);
      const items = d.items||[];
      const riskRows = items.map((it, i) => {
        const lvl = it.riskLevel || (it.frequency ? `${it.frequency*it.severity}점` : '-');
        const lvlIcon = lvl==='상'||Number(lvl)>=15 ? '🔴' : lvl==='중'||Number(lvl)>=8 ? '🟡' : '🟢';
        return [`${i+1}. ${tr(it.hazard,20)}`, tr(it.countermeasure,20), `${lvlIcon} ${lvl}`];
      });
      const riskTbl = riskRows.length
        ? '\n\n⚠️ 위험요인 목록\n' + this._textTable(['위험요인','대책','위험도'], riskRows)
        : '';
      return `${HDR}\n${DIV}\n${tbl(infoRows)}${riskTbl}\n${DIV}`;
    }

    // ── 안전점검 ──────────────────────────────────────────────
    if (type === 'checklist') {
      const infoRows = [
        ['📅 점검일자', this.formatDate(d.date)],
        ['📋 점검유형', tr(d.type)],
        ['📍 점검장소', tr(d.location)],
        ['👤 점검자',   tr(d.inspector)],
        ['💬 종합의견', tr(d.opinion)],
      ].filter(([,v]) => v);
      const resRows = Object.entries(d.results||{}).map(([k, v]) =>
        [tr(k, 22), v==='pass'?'✅ 양호':v==='fail'?'❌ 불량':'— N/A']
      );
      const resTbl = resRows.length
        ? '\n\n🔍 점검결과\n' + this._textTable(['점검항목','결과'], resRows)
        : '';
      return `${HDR}\n${DIV}\n${tbl(infoRows)}${resTbl}\n${DIV}`;
    }

    // ── 작업계획서 ────────────────────────────────────────────
    if (type === 'workplan') {
      const stMap = {submitted:'📤 신청',approved:'✅ 승인',rejected:'❌ 반려'};
      const rows = [
        ['📊 상태',     stMap[d.status]||d.status||'-'],
        ['📅 작성일자', this.formatDate(d.date)],
        ['🏢 업체명',   tr(d.company)],
        ['🏗️ 작업명',   tr(d.workName)],
        ['📍 작업장소', tr(d.location)],
        ['📆 작업기간', tr(d.period)],
        ['👥 작업인원', (d.workers||0)+'명'],
        ['👔 현장책임자',tr(d.supervisor)],
        ['🚧 투입장비', tr(d.equipment)],
        ['📝 작업내용', tr(d.content)],
        ['⚠️ 위험요인', tr(d.hazards)],
        ['🛡️ 안전대책', tr(d.measures)],
        ['📷 TBM사진',  d.tbmPhoto ? '✅ 있음' : '⬜ 없음'],
        ['✍️ 책임자서명',d.supervisorSignature ? '✅ 완료' : '⬜ 없음'],
      ].filter(([,v]) => v && v !== '0명');
      return `${HDR}\n${DIV}\n${tbl(rows)}\n${DIV}`;
    }

    // ── 작업허가서 ────────────────────────────────────────────
    if (type === 'ptw') {
      const stMap = {submitted:'📤 신청',reviewing:'🔍 검토 중',approved:'✅ 허가 완료',rejected:'❌ 반려'};
      const checkerResult = d.checkerResult==='ok' ? '✅ 이상없음'
                          : d.checkerResult==='conditional' ? '⚠️ 보완 후 작업' : '-';
      const infoRows = [
        ['📊 상태',      stMap[d.status]||d.status||'-'],
        ['📅 작업일자',  this.formatDate(d.date)],
        ['🔧 작업유형',  tr((d.workTypeLabels||d.workTypes||[]).join(', '))],
        ['🏢 신청업체',  tr(d.company)],
        ['👤 신청자',    tr(`${d.position||''} ${d.requestorName||''}`.trim())],
        ['📝 작업내용',  tr(d.workName)],
        ['📍 작업장소',  tr(d.location)],
        ['📆 작업기간',  `${this.formatDate(d.periodStart)} ~ ${this.formatDate(d.periodEnd)}`],
        ['🚧 투입장비',  tr(d.equipment)],
        ['💬 요청사항',  tr(d.requestNotes)],
        ['✍️ 신청자서명',d.requestorSignature ? '✅ 완료' : '⬜ 없음'],
        ['🔍 확인결과',  checkerResult],
        ['👤 확인자',    tr(`${d.checkerDept||''} ${d.checkerName||''}`.trim())],
        ['📌 보완내용',  tr(d.checkerMemo)],
        ['👔 허가자',    tr(`${d.approverDept||''} ${d.approverName||''}`.trim())],
        ['📜 허가조건',  tr(d.permitContent)],
        ['✍️ 허가자서명',d.approverSignature ? '✅ 완료' : '⬜ 없음'],
      ].filter(([,v]) => v && v !== '~ ');

      // 사전 체크결과 표
      const checksByType = {};
      Object.entries(d.checkResults||{}).forEach(([k, v]) => {
        const lastU = k.lastIndexOf('_');
        const tk = k.substring(0, lastU);
        const idx = parseInt(k.substring(lastU + 1));
        if (!checksByType[tk]) checksByType[tk] = [];
        checksByType[tk].push({ idx, v });
      });
      const checkRows = [];
      Object.entries(checksByType).forEach(([tk, items]) => {
        const cl = (typeof PTW !== 'undefined') ? PTW.checklists[tk] : null;
        const typeLabel = cl ? cl.label : tk;
        items.sort((a,b) => a.idx-b.idx).forEach(({idx, v}) => {
          const statusLabel = v==='pass'?'✅ 적합':v==='fail'?'❌ 부적합':'— N/A';
          const itemLabel   = cl && cl.items[idx] ? this._trunc(cl.items[idx], 20) : `항목 ${idx+1}`;
          checkRows.push([typeLabel, itemLabel, statusLabel]);
        });
      });
      const checkTbl = checkRows.length
        ? '\n\n🔍 사전 체크결과\n' + this._textTable(['작업유형','체크항목','결과'], checkRows)
        : '';
      return `${HDR}\n${DIV}\n${tbl(infoRows)}${checkTbl}\n${DIV}`;
    }

    // ── 안전사고발생보고서 ────────────────────────────────────
    if (type === 'accident') {
      const isNear = d.accidentType === 'nearmiss';
      const rows = [
        ['🚨 사고유형',   d.accidentTypeLabel || d.accidentType || '-'],
        ['📅 발생일자',   this.formatDate(d.date)],
        ['🕐 발생시간',   d.time || '-'],
        ['📍 발생장소',   this._trunc(d.location, 24)],
        ['👤 보고자',     this._trunc(d.reporter, 14)],
        ['🏢 소속',       this._trunc(d.department, 14)],
        ['📝 사고경위',   this._trunc(d.content, 30)],
        ['🔍 추정원인',   this._trunc(d.cause, 30)],
        ...(!isNear ? [
          ['🏥 부상자',   this._trunc(d.injuredName, 14)],
          ['👤 나이/소속',this._trunc(d.injuredInfo, 14)],
          ['🤕 부상부위', this._trunc(d.injuredPart, 14)],
          ['⚕️ 부상정도', this._trunc(d.injuredLevel, 14)],
        ] : []),
        ['🆘 즉시조치',   this._trunc(d.immediateAction, 30)],
        ['📌 재발방지',   this._trunc(d.preventionPlan, 30)],
        ['📷 현장사진',   (d.photos||[]).length ? `${d.photos.length}장 첨부` : '없음'],
        ['✍️ 서명',       d.reporterSignature ? '✅ 완료' : '⬜ 없음'],
      ].filter(([, v]) => v && v !== '-');
      return `${HDR}\n${DIV}\n${tbl(rows)}\n${DIV}`;
    }

    return `${HDR}\n${DIV}\n` + JSON.stringify(d, null, 2);
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ══════════════════════════════════════════════════════════
  //  PWA 홈 화면 설치 & 오프라인 준비 상태
  // ══════════════════════════════════════════════════════════

  setupPWAInstall() {
    // 이미 홈 화면에서 실행 중이면 배너 불필요
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      // 홈 화면 앱으로 실행 중 → 오프라인 준비 상태만 확인
      this.checkOfflineReady();
      return;
    }

    // 이미 닫은 배너인지 확인
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    if (dismissed === 'true') {
      // 오프라인 캐시 상태만 표시
      this.checkOfflineReady();
      return;
    }

    const banner    = document.getElementById('pwa-install-banner');
    const titleEl   = document.getElementById('pwa-install-title');
    const descEl    = document.getElementById('pwa-install-desc');
    const installBtn = document.getElementById('pwa-install-btn');
    if (!banner) return;

    // ── iOS Safari 감지 ──────────────────────────────────────
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS && isSafari) {
      // iOS: 직접 설치 프롬프트 없음 → 안내 텍스트 표시
      titleEl.textContent  = '홈 화면에 추가하면 오프라인 사용 가능!';
      descEl.innerHTML     = '공유 버튼(□↑) → <b>홈 화면에 추가</b> → 추가';
      installBtn.textContent = '방법 확인';
      installBtn.onclick   = () => this._showIOSInstallGuide();
      banner.classList.remove('hidden');
    } else if (window._pwaInstallPrompt) {
      // Android: 이미 이벤트 캡처됨
      this._onInstallPromptAvailable();
    }
    // Android: 아직 이벤트 안 왔으면 window.addEventListener('beforeinstallprompt') 가 처리

    this.checkOfflineReady();
  },

  // beforeinstallprompt 이벤트 캡처됐을 때 호출
  _onInstallPromptAvailable() {
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (dismissed === 'true' || isStandalone) return;

    const banner    = document.getElementById('pwa-install-banner');
    const titleEl   = document.getElementById('pwa-install-title');
    const descEl    = document.getElementById('pwa-install-desc');
    const installBtn = document.getElementById('pwa-install-btn');
    if (!banner) return;

    titleEl.textContent  = '홈 화면에 추가하면 오프라인에서도 사용!';
    descEl.textContent   = '서버(PC)가 꺼져도 앱처럼 바로 실행됩니다';
    installBtn.textContent = '지금 추가';
    installBtn.onclick   = () => this.triggerPWAInstall();
    banner.classList.remove('hidden');
  },

  // 설치 버튼 탭 → 네이티브 프롬프트 표시
  async triggerPWAInstall() {
    if (!window._pwaInstallPrompt) {
      // iOS 또는 프롬프트 없는 경우
      this._showIOSInstallGuide();
      return;
    }
    try {
      window._pwaInstallPrompt.prompt();
      const { outcome } = await window._pwaInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        this.showToast('✅ 홈 화면에 추가됐습니다!');
        this.dismissPWABanner(true);
      } else {
        this.showToast('나중에 업데이트 버튼 옆에서 다시 추가할 수 있습니다');
      }
      window._pwaInstallPrompt = null;
    } catch(e) {
      console.warn('[PWA] 설치 프롬프트 오류:', e);
    }
  },

  dismissPWABanner(permanent = false) {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('hidden');
    if (permanent) localStorage.setItem('pwa_banner_dismissed', 'true');
  },

  // iOS 설치 가이드 모달 (네이티브 프롬프트 없음)
  _showIOSInstallGuide() {
    const existing = document.getElementById('ios-install-guide');
    if (existing) { existing.remove(); return; }

    const guide = document.createElement('div');
    guide.id = 'ios-install-guide';
    guide.className = 'ios-install-guide';
    guide.innerHTML = `
      <div class="ios-guide-box">
        <div class="ios-guide-header">
          <span>📲 홈 화면에 추가하는 방법</span>
          <button onclick="document.getElementById('ios-install-guide').remove()">✕</button>
        </div>
        <ol class="ios-guide-steps">
          <li>화면 하단 <b>공유 버튼</b>(□↑)을 탭하세요</li>
          <li>스크롤하여 <b>홈 화면에 추가</b>를 선택하세요</li>
          <li><b>추가</b>를 탭하면 완료!</li>
        </ol>
        <div class="ios-guide-note">홈 화면 아이콘으로 실행하면<br>서버가 꺼져도 오프라인으로 사용 가능합니다 ✅</div>
      </div>
      <div class="ios-guide-arrow">▼</div>`;
    guide.addEventListener('click', (e) => {
      if (e.target === guide) guide.remove();
    });
    document.body.appendChild(guide);
    setTimeout(() => guide.classList.add('ios-guide-visible'), 10);
  },

  // SW에 캐시 상태 조회 요청
  checkOfflineReady() {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      // SW가 아직 활성화되지 않음 — 잠시 후 재시도
      setTimeout(() => {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CACHE_CHECK' });
        }
      }, 3000);
      return;
    }
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_CHECK' });
  },

  // SW로부터 캐시 상태 수신 (index.html message 리스너가 호출)
  _onCacheStatus(data) {
    const badge = document.getElementById('offline-ready-badge');
    if (!badge) return;

    const count = data.count || 0;
    const total = data.total || 1;
    const pct   = Math.round((count / total) * 100);

    if (pct >= 100) {
      badge.className  = 'offline-ready-badge ready';
      badge.innerHTML  = '✅ 오프라인 사용 가능';
      badge.title      = `${count}/${total}개 파일 캐시 완료`;
    } else if (pct >= 50) {
      badge.className  = 'offline-ready-badge partial';
      badge.innerHTML  = `⏳ 캐시 준비 중 (${pct}%)`;
      badge.title      = `${count}/${total}개 캐시됨`;
    } else {
      badge.className  = 'offline-ready-badge loading';
      badge.innerHTML  = '⚠️ 오프라인 미준비';
      badge.title      = `캐시 파일 부족 (${count}/${total})`;
    }
    badge.classList.remove('hidden');
  },

  // ── 홈 접속 주소 카드 로딩 (+ 30초 자동갱신) ─────────────
  _accessUrlTimer: null,

  async loadAccessUrl() {
    await this._refreshAccessUrl();
    // CF URL은 서버 재시작마다 바뀌므로 30초마다 자동 갱신
    if (this._accessUrlTimer) clearInterval(this._accessUrlTimer);
    this._accessUrlTimer = setInterval(() => this._refreshCfUrl(), 30000);
  },

  async _refreshAccessUrl() {
    const card = document.getElementById('access-url-card');
    if (!card) return;
    const t = Date.now();

    // Wi-Fi / Tailscale 고정 주소
    const _bom = (s) => s.replace(/^﻿/, '').trim();

    let stableUrl = '';
    try {
      const r = await fetch('/tunnel-url.txt?_=' + t, { cache: 'no-store' });
      if (r.ok) stableUrl = _bom(await r.text());
    } catch(e) {}

    // Cloudflare 외부 주소 (재시작마다 변경)
    let cfUrl = '';
    try {
      const r = await fetch('/cf-url.txt?_=' + t, { cache: 'no-store' });
      if (r.ok) cfUrl = _bom(await r.text());
    } catch(e) {}

    // fallback
    if (!stableUrl && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      try {
        const localRes = await fetch('/local-ip.txt?_=' + t, { cache: 'no-store' });
        if (localRes.ok) {
          const localText = (await localRes.text()).replace(/^﻿/, '').trim();
          if (localText.startsWith('http')) stableUrl = localText;
        }
      } catch(e) {}
    }
    if (!stableUrl) stableUrl = location.href.split('?')[0].split('#')[0].replace(/\/index\.html$/, '/').replace(/([^/])$/, '$1/');

    // DOM 업데이트
    const stableEl = document.getElementById('access-url-stable');
    const cfEl     = document.getElementById('access-url-cf');
    const cfRow    = document.getElementById('access-url-cf-row');

    if (stableEl) { stableEl.textContent = stableUrl; stableEl.title = stableUrl; }
    if (cfEl && cfRow) {
      if (cfUrl) {
        cfEl.textContent = cfUrl; cfEl.title = cfUrl;
        cfRow.classList.remove('hidden');
      } else {
        cfRow.classList.add('hidden');
      }
    }
    card.classList.remove('hidden');
  },

  // CF URL만 조용히 갱신 (30초마다)
  async _refreshCfUrl() {
    // 홈 페이지가 보일 때만 갱신
    if (this.currentPage !== 'home') return;
    const t = Date.now();
    let cfUrl = '';
    try {
      const r = await fetch('/cf-url.txt?_=' + t, { cache: 'no-store' });
      if (r.ok) cfUrl = (await r.text()).replace(/^﻿/, '').trim();
    } catch(e) { return; }

    const cfEl  = document.getElementById('access-url-cf');
    const cfRow = document.getElementById('access-url-cf-row');
    if (!cfEl || !cfRow) return;

    if (cfUrl) {
      // URL이 바뀌었으면 깜빡임 표시
      if (cfEl.textContent.trim() !== cfUrl) {
        cfEl.textContent = cfUrl;
        cfEl.title = cfUrl;
        cfEl.classList.add('cf-url-updated');
        setTimeout(() => cfEl.classList.remove('cf-url-updated'), 1500);
      }
      cfRow.classList.remove('hidden');
    } else {
      cfRow.classList.add('hidden');
    }
  },

  copyUrl(elId) {
    const el = document.getElementById(elId);
    const url = el ? el.textContent.trim() : this.getAppBaseUrl();
    if (!url || url === '로딩 중...') return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => this.showToast('✅ 주소 복사 완료'));
    } else {
      const inp = document.createElement('input');
      inp.value = url; document.body.appendChild(inp);
      inp.select(); document.execCommand('copy');
      document.body.removeChild(inp);
      this.showToast('✅ 주소 복사 완료');
    }
  },

  // 하위 호환 (기존 호출 유지)
  copyAccessUrl() { this.copyUrl('access-url-stable'); },

  // ── 강제 업데이트 ──────────────────────────────────────────
  async forceUpdate() {
    const ok = await App.confirm(
      '모든 캐시를 삭제하고 최신 버전으로 새로고침합니다.<br>현재 작성 중인 내용이 사라질 수 있습니다.',
      { type: 'warning', title: '앱을 강제 업데이트합니다', icon: '🔄' }
    );
    if (!ok) return;
    this.showToast('🔄 캐시 초기화 중...');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch(e) {
      console.warn('[forceUpdate] 캐시 삭제 오류:', e);
    }
    localStorage.removeItem('sfo_ver');
    location.replace(location.pathname + '?r=' + Date.now());
  }
};

// Initialize app when DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
