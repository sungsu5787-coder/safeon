// ===== WorkplaceInfo — 사업장현황 =====
const WorkplaceInfo = {
  _items: [],

  onPageShow() {
    this._bindForm();
    this.load();
  },

  _bindForm() {
    const form = document.getElementById('wi-form');
    if (!form || form._bound) return;
    form._bound = true;
    form.addEventListener('submit', e => { e.preventDefault(); this.save(); });

    // 사업자등록번호 자동 하이픈
    const bizno = document.getElementById('wi-bizno');
    if (bizno) {
      bizno.addEventListener('input', e => {
        let v = e.target.value.replace(/[^0-9]/g, '');
        if (v.length > 3 && v.length <= 5)      v = v.slice(0,3) + '-' + v.slice(3);
        else if (v.length > 5)                   v = v.slice(0,3) + '-' + v.slice(3,5) + '-' + v.slice(5,10);
        e.target.value = v;
      });
    }
  },

  async load() {
    const listEl = document.getElementById('wi-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="wi-loading">불러오는 중...</div>';
    try {
      const snap = await collections.workplaceinfo.orderBy('createdAt', 'desc').get();
      this._items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._render();
    } catch (err) {
      listEl.innerHTML = `<div class="wi-empty">오류: ${App.escapeHtml(err.message)}</div>`;
    }
  },

  _render() {
    const listEl = document.getElementById('wi-list');
    if (!listEl) return;
    if (!this._items.length) {
      listEl.innerHTML = '<div class="wi-empty">등록된 사업장이 없습니다</div>';
      return;
    }
    listEl.innerHTML = this._items.map(item => this._cardHTML(item)).join('');
  },

  _cardHTML(item) {
    const totalStaff = (parseInt(item.staff) || 0) + (parseInt(item.contract) || 0);
    return `
      <div class="wi-card">
        <div class="wi-card-header">
          <div class="wi-card-name">${App.escapeHtml(item.name)}</div>
          <div class="wi-card-actions">
            <button class="wi-btn-edit" onclick="WorkplaceInfo.startEdit('${item.id}')" title="수정">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="wi-btn-del" onclick="WorkplaceInfo.remove('${item.id}')" title="삭제">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
        <div class="wi-card-body">
          ${item.ceo      ? `<div class="wi-row"><span class="wi-key">대표자</span><span class="wi-val">${App.escapeHtml(item.ceo)}</span></div>` : ''}
          ${item.bizno    ? `<div class="wi-row"><span class="wi-key">사업자번호</span><span class="wi-val wi-mono">${App.escapeHtml(item.bizno)}</span></div>` : ''}
          ${item.address  ? `<div class="wi-row"><span class="wi-key">소재지</span><span class="wi-val">${App.escapeHtml(item.address)}</span></div>` : ''}
          ${(item.product || item.biztype || item.bizitem) ? `<div class="wi-row">
            <span class="wi-key">업종정보</span>
            <span class="wi-val">
              ${item.product  ? `<span class="wi-tag">주생산품 ${App.escapeHtml(item.product)}</span>`  : ''}
              ${item.biztype  ? `<span class="wi-tag">업태 ${App.escapeHtml(item.biztype)}</span>`      : ''}
              ${item.bizitem  ? `<span class="wi-tag">종목 ${App.escapeHtml(item.bizitem)}</span>`      : ''}
            </span>
          </div>` : ''}
          <div class="wi-row">
            <span class="wi-key">인원</span>
            <span class="wi-val">
              <span class="wi-badge wi-badge-staff">정직원 ${item.staff || 0}명</span>
              <span class="wi-badge wi-badge-contract">도급직 ${item.contract || 0}명</span>
              <span class="wi-badge wi-badge-total">합계 ${totalStaff}명</span>
            </span>
          </div>
          ${item.note ? `<div class="wi-row"><span class="wi-key">비고</span><span class="wi-val wi-note">${App.escapeHtml(item.note)}</span></div>` : ''}
        </div>
        <div class="wi-card-footer">${item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric'}) : ''} 등록</div>
      </div>`;
  },

  async save() {
    const name     = document.getElementById('wi-name').value.trim();
    const ceo      = document.getElementById('wi-ceo').value.trim();
    const bizno    = document.getElementById('wi-bizno').value.trim();
    const address  = document.getElementById('wi-address').value.trim();
    const product  = document.getElementById('wi-product').value.trim();
    const biztype  = document.getElementById('wi-biztype').value.trim();
    const bizitem  = document.getElementById('wi-bizitem').value.trim();
    const staff    = parseInt(document.getElementById('wi-staff').value) || 0;
    const contract = parseInt(document.getElementById('wi-contract').value) || 0;
    const note     = document.getElementById('wi-note').value.trim();

    if (!name) { App.showToast('사업장명을 입력하세요'); return; }

    const ok = await App.confirm(
      `<b>${App.escapeHtml(name)}</b><br>정직원 ${staff}명 · 도급직 ${contract}명`,
      { type: 'save', title: '사업장을 등록하시겠습니까?', icon: '🏢' }
    );
    if (!ok) return;

    try {
      await collections.workplaceinfo.add({
        name, ceo, bizno, address,
        product, biztype, bizitem,
        staff, contract, note,
        createdAt: new Date().toISOString()
      });
      App.showToast('✅ 사업장이 등록되었습니다');
      document.getElementById('wi-form').reset();
      this.load();
    } catch (err) {
      App.showToast('저장 오류: ' + err.message);
    }
  },

  async remove(id) {
    const item = this._items.find(i => i.id === id);
    const ok = await App.confirm(
      `<b>${App.escapeHtml(item?.name || '사업장')}</b>을 삭제합니다.<br>삭제된 데이터는 복구할 수 없습니다.`,
      { type: 'delete', title: '사업장을 삭제하시겠습니까?' }
    );
    if (!ok) return;
    try {
      await collections.workplaceinfo.doc(id).delete();
      App.showToast('🗑️ 삭제되었습니다');
      this.load();
    } catch (err) {
      App.showToast('삭제 오류: ' + err.message);
    }
  },

  startEdit(id) {
    const item = this._items.find(i => i.id === id);
    if (!item) return;

    // 폼에 값 채우기
    document.getElementById('wi-name').value     = item.name     || '';
    document.getElementById('wi-ceo').value      = item.ceo      || '';
    document.getElementById('wi-bizno').value    = item.bizno    || '';
    document.getElementById('wi-address').value  = item.address  || '';
    document.getElementById('wi-product').value  = item.product  || '';
    document.getElementById('wi-biztype').value  = item.biztype  || '';
    document.getElementById('wi-bizitem').value  = item.bizitem  || '';
    document.getElementById('wi-staff').value    = item.staff    || '';
    document.getElementById('wi-contract').value = item.contract || '';
    document.getElementById('wi-note').value     = item.note     || '';

    // submit 동작을 update로 전환
    const form   = document.getElementById('wi-form');
    const btnEl  = form.querySelector('button[type="submit"]');
    btnEl.textContent = '✏️ 수정 저장';
    btnEl.style.background = '#D97706';

    form._editId = id;
    form.onsubmit = async e => {
      e.preventDefault();
      await this._update(id);
      form._editId = null;
      form.onsubmit = null;
      btnEl.textContent = '🏢 사업장 등록';
      btnEl.style.background = '#0d9488';
    };

    // 폼 상단으로 스크롤
    document.getElementById('wi-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('wi-name').focus();
    App.showToast('✏️ 수정 모드 — 내용 변경 후 저장하세요');
  },

  print() {
    if (!this._items.length) { App.showToast('등록된 사업장이 없습니다'); return; }

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { App.showToast('팝업이 차단되었습니다. 팝업을 허용해 주세요.'); return; }

    const rows = this._items.map((item, idx) => {
      const total = (parseInt(item.staff) || 0) + (parseInt(item.contract) || 0);
      return `<tr>
        <td class="center">${idx + 1}</td>
        <td><b>${this._esc(item.name)}</b></td>
        <td class="center">${this._esc(item.ceo || '-')}</td>
        <td class="center mono">${this._esc(item.bizno || '-')}</td>
        <td>${this._esc(item.address || '-')}</td>
        <td class="center">${this._esc(item.product || '-')}</td>
        <td class="center">${this._esc(item.biztype || '-')}</td>
        <td class="center">${this._esc(item.bizitem || '-')}</td>
        <td class="center">${item.staff || 0}</td>
        <td class="center">${item.contract || 0}</td>
        <td class="center bold">${total}</td>
        <td>${this._esc(item.note || '')}</td>
      </tr>`;
    }).join('');

    const totalStaff    = this._items.reduce((s, i) => s + (parseInt(i.staff)    || 0), 0);
    const totalContract = this._items.reduce((s, i) => s + (parseInt(i.contract) || 0), 0);
    const grandTotal    = totalStaff + totalContract;

    win.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>사업장현황</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif; font-size:10.5pt; color:#202124; background:#fff; padding:18mm 16mm; }
  .doc-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:0; }
  .doc-title-block h1 { font-size:19pt; font-weight:900; letter-spacing:1.5px; margin-bottom:4px; }
  .doc-title-block .sub { font-size:9.5pt; color:#666; }
  .approval-table { border-collapse:collapse; }
  .approval-table th { background:#f1f3f4; font-size:8pt; font-weight:700; text-align:center; padding:4px 0; border:1px solid #444; width:62px; }
  .approval-table td { height:52px; border:1px solid #444; width:62px; vertical-align:top; padding:3px; }
  hr { border:none; border-top:2px solid #202124; margin:10px 0 16px; }
  table.main { width:100%; border-collapse:collapse; font-size:9.5pt; }
  table.main th { background:#f1f3f4; font-weight:700; text-align:center; padding:6px 6px; border:1px solid #aaa; white-space:nowrap; }
  table.main td { padding:6px 6px; border:1px solid #bbb; vertical-align:middle; }
  table.main tfoot td { background:#f8f8f8; font-weight:700; }
  .center { text-align:center; }
  .bold   { font-weight:700; }
  .mono   { font-family:ui-monospace,monospace; font-size:9pt; letter-spacing:0.3px; }
  .footer { text-align:center; font-size:8pt; color:#999; margin-top:16px; padding-top:8px; border-top:1px solid #ddd; }
  @media print { body { padding:10mm 12mm; } @page { size:A4 landscape; margin:10mm; } }
</style>
</head>
<body>
<div class="doc-header">
  <div class="doc-title-block">
    <h1>사업장현황</h1>
    <div class="sub">SAMHWA SafeOn &nbsp;·&nbsp; 출력일: ${new Date().toLocaleDateString('ko-KR')} &nbsp;·&nbsp; 총 ${this._items.length}개소</div>
  </div>
  <div class="approval-wrap">
    <table class="approval-table">
      <thead><tr><th>담당</th><th></th><th></th></tr></thead>
      <tbody><tr><td></td><td></td><td></td></tr></tbody>
    </table>
  </div>
</div>
<hr>
<table class="main">
  <thead>
    <tr>
      <th style="width:32px">No.</th>
      <th>사업장명</th>
      <th>대표자</th>
      <th>사업자등록번호</th>
      <th>소재지</th>
      <th>주생산품</th>
      <th>업태</th>
      <th>종목</th>
      <th style="width:48px">정직원</th>
      <th style="width:48px">도급직</th>
      <th style="width:48px">합계</th>
      <th>비고</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr>
      <td colspan="8" class="center">합 계</td>
      <td class="center">${totalStaff}</td>
      <td class="center">${totalContract}</td>
      <td class="center bold">${grandTotal}</td>
      <td></td>
    </tr>
  </tfoot>
</table>
<div class="footer">SAMHWA SafeOn &nbsp;|&nbsp; 사업장현황 &nbsp;|&nbsp; 출력일: ${new Date().toLocaleDateString('ko-KR')}</div>
<script>window.onload = () => { window.print(); };<\/script>
</body></html>`);
    win.document.close();
  },

  _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  async _update(id) {
    const name     = document.getElementById('wi-name').value.trim();
    const ceo      = document.getElementById('wi-ceo').value.trim();
    const bizno    = document.getElementById('wi-bizno').value.trim();
    const address  = document.getElementById('wi-address').value.trim();
    const product  = document.getElementById('wi-product').value.trim();
    const biztype  = document.getElementById('wi-biztype').value.trim();
    const bizitem  = document.getElementById('wi-bizitem').value.trim();
    const staff    = parseInt(document.getElementById('wi-staff').value) || 0;
    const contract = parseInt(document.getElementById('wi-contract').value) || 0;
    const note     = document.getElementById('wi-note').value.trim();

    if (!name) { App.showToast('사업장명을 입력하세요'); return; }
    try {
      await collections.workplaceinfo.doc(id).update({
        name, ceo, bizno, address,
        product, biztype, bizitem,
        staff, contract, note
      });
      App.showToast('✅ 수정되었습니다');
      document.getElementById('wi-form').reset();
      this.load();
    } catch (err) {
      App.showToast('수정 오류: ' + err.message);
    }
  }
};
