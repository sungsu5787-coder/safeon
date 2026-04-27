// ===== QR Code Modal =====
const QRModal = {
  _appUrl:       '',
  _tunnelUrl:    '',
  _wifiUrl:      '',
  _tailscaleUrl: '',
  _guestUrl:     '',
  _activeTab:    'normal',

  // 화면 높이에 따라 QR 셀 크기 반환
  _qrCellSize() {
    const h = window.innerHeight;
    if (h <= 620) return { cell: 4, margin: 10 };
    if (h <= 740) return { cell: 5, margin: 12 };
    return { cell: 6, margin: 14 };
  },

  // ── WebRTC로 이 PC의 실제 로컬 IP 감지 ────────────────────
  _detectLocalIP() {
    return new Promise(resolve => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => resolve(''));
        const found = new Set();
        const _pickBest = () => {
          const ips = [...found];
          return ips.find(ip => ip.startsWith('192.168.')) ||
                 ips.find(ip => ip.startsWith('10.'))      ||
                 ips.find(ip => ip.startsWith('172.'))     ||
                 ips[0] || '';
        };
        pc.onicecandidate = e => {
          if (!e || !e.candidate) {
            pc.close();
            resolve(_pickBest());
            return;
          }
          const m = e.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
          if (m) {
            const ip = m[1];
            if (!ip.startsWith('127.') && !ip.startsWith('169.254')) found.add(ip);
          }
        };
        setTimeout(() => { try { pc.close(); } catch {} resolve(_pickBest()); }, 2000);
      } catch { resolve(''); }
    });
  },

  async open() {
    const modal = document.getElementById('qr-modal');
    modal.classList.remove('hidden');
    // 모달 박스 스크롤 초기화
    const box = modal.querySelector('.qr-modal-box');
    if (box) box.scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('qr-modal-visible')));
    // 게스트 모드에서 열면 탭 없이 바로 일반 패널만
    this.switchTab('normal');
    await this.refresh();
  },

  // ── 탭 전환 ──────────────────────────────────────────────
  switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('.qr-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    document.getElementById('qr-panel-normal').classList.toggle('hidden', tab !== 'normal');
    document.getElementById('qr-panel-guest').classList.toggle('hidden', tab !== 'guest');
    const subtitle = document.getElementById('qr-modal-subtitle');
    if (subtitle) subtitle.textContent = tab === 'guest' ? '🔒 게스트 접속 QR 생성' : 'QR 코드로 앱 접속';
  },

  // ── 게스트 QR 생성 ──────────────────────────────────────
  generateGuestQR() {
    const checks = document.querySelectorAll('input[name="guest-perm"]:checked');
    if (!checks.length) {
      App.showToast('접근 허용할 메뉴를 최소 1개 선택하세요');
      return;
    }
    const perms   = Array.from(checks).map(c => c.value).join(',');
    const baseUrl = this._tailscaleUrl || this._tunnelUrl || this._wifiUrl ||
                    `http://localhost${location.port ? ':' + location.port : ''}`;
    const guestUrl = `${baseUrl.replace(/\/$/, '')}/?guest=1&perm=${perms}`;
    this._guestUrl = guestUrl;

    // QR 생성
    const qrWrap = document.getElementById('guest-qr-img');
    try {
      const qr = qrcode(0, 'M');
      qr.addData(guestUrl);
      qr.make();
      const { cell, margin } = (() => {
        const s = this._qrCellSize();
        return { cell: Math.max(4, s.cell - 1), margin: s.margin };
      })();
      const count = qr.getModuleCount();
      const size  = count * cell + margin * 2;
      let rects = '';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c))
            rects += `<rect x="${c*cell+margin}" y="${r*cell+margin}" width="${cell}" height="${cell}" fill="#6a1b9a"/>`;
        }
      }
      qrWrap.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="border-radius:10px;display:block">` +
        `<rect width="${size}" height="${size}" fill="#fff" rx="10"/>${rects}</svg>`;
    } catch {
      qrWrap.innerHTML = '<p style="color:#d93025;font-size:12px;padding:16px">QR 생성 실패</p>';
    }

    document.getElementById('guest-qr-url-text').textContent = guestUrl;
    document.getElementById('guest-qr-result').classList.remove('hidden');
    App.showToast('🔒 게스트 QR이 생성됐습니다');
  },

  // URL을 _guestUrl 또는 DOM 텍스트에서 가져옴 (둘 다 없으면 현재 페이지)
  _resolveGuestUrl() {
    if (this._guestUrl) return this._guestUrl;
    const el = document.getElementById('guest-qr-url-text');
    if (el && el.textContent && el.textContent.startsWith('http')) return el.textContent.trim();
    // 현재 페이지가 게스트 URL이면 그대로 사용
    if (location.search.includes('guest=1')) return location.href;
    return '';
  },

  async copyGuestUrl() {
    const url = this._resolveGuestUrl();
    if (!url) { App.showToast('먼저 게스트 QR을 생성하세요'); return; }
    try {
      await navigator.clipboard.writeText(url);
      App.showToast('게스트 URL 복사됐습니다 📋');
    } catch {
      // clipboard 실패 시 prompt로 수동 복사 유도
      window.prompt('아래 주소를 복사하세요 (Ctrl+C / 길게 누르기)', url);
    }
  },

  async shareGuestUrl() {
    const url = this._resolveGuestUrl();
    if (!url) { App.showToast('먼저 게스트 QR을 생성하세요'); return; }

    const PERM_KO = { tbm:'TBM', risk:'위험성평가', checklist:'안전점검', workplan:'작업계획서', ptw:'작업허가서', accident:'사고보고서' };
    const permsText = (() => {
      try {
        const raw = new URLSearchParams(url.split('?')[1]).get('perm') || '';
        return raw.split(',').map(p => PERM_KO[p] || p).join(', ');
      } catch { return ''; }
    })();
    const shareText = `🔒 SAMHWA SafeOn 게스트 접속\n\n${url}\n\n허용 메뉴: ${permsText}\n(읽기 전용)`;

    // 1순위: Web Share API (모바일 카카오·문자·메일 등)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SafeOn 게스트 접속', text: shareText, url });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // 사용자가 직접 취소
        // share 실패 → 다음 방법으로
      }
    }

    // 2순위: 클립보드 복사
    try {
      await navigator.clipboard.writeText(url);
      App.showToast('주소가 복사됐습니다 — 카카오톡 등에 붙여넣기 하세요 📋');
      return;
    } catch { /* 다음 방법으로 */ }

    // 3순위: execCommand 복사 (구형 브라우저)
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      App.showToast('주소가 복사됐습니다 📋');
      return;
    } catch { /* 다음 방법으로 */ }

    // 4순위: prompt로 수동 복사 유도
    window.prompt('아래 주소를 직접 복사하세요', url);
  },

  // ── QR 재생성 ────────────────────────────────────────────
  async refresh() {
    const qrWrap     = document.getElementById('qr-code-img');
    const refreshBtn = document.getElementById('btn-qr-refresh');

    qrWrap.innerHTML = '<div class="qr-loading"><span class="qr-spin">↻</span> 주소 확인 중...</div>';
    if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.textContent = '...'; }

    const _stripBom = (s) => s.replace(/^﻿/, '').trim();

    // ── tunnel-url.txt 읽기 (Wi-Fi / Tailscale 고정 주소) ────
    let savedUrl = '';
    try {
      const res = await fetch('/tunnel-url.txt?_=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const txt = _stripBom(await res.text());
        if (txt.startsWith('http')) savedUrl = txt;
      }
    } catch (_) {}

    // ── cf-url.txt 읽기 (Cloudflare 터널 — 재시작마다 변경) ──
    let cfUrl = '';
    try {
      const res2 = await fetch('/cf-url.txt?_=' + Date.now(), { cache: 'no-store' });
      if (res2.ok) {
        const txt2 = _stripBom(await res2.text());
        if (txt2.startsWith('http')) cfUrl = txt2;
      }
    } catch (_) {}

    const currentUrl = location.href.split('?')[0].split('#')[0].replace(/\/index\.html$/, '/').replace(/([^/])$/, '$1/');
    const isTunnel    = (u) => u && (u.includes('trycloudflare.com') || u.includes('ngrok') || u.includes('tunnel') || u.includes('bore.pub') || u.includes('localhost.run'));
    const isTailscale = (u) => u && /http:\/\/100\.\d+\.\d+\.\d+/.test(u);
    const isLocalIP   = (u) => {
      if (!u || isTailscale(u)) return false;
      return /http:\/\/192\.168\./.test(u) ||
             /http:\/\/10\./.test(u)        ||
             /http:\/\/172\.(1[6-9]|2\d|3[01])\./.test(u);
    };
    const isLocalhost = (u) => u && (u.includes('localhost') || u.includes('127.0.0.1'));
    const port        = location.port || '';

    // URL 분류
    this._tailscaleUrl = isTailscale(savedUrl)   ? savedUrl
                       : isTailscale(currentUrl) ? currentUrl : '';
    this._tunnelUrl    = isTunnel(savedUrl)    ? savedUrl
                       : isTunnel(currentUrl)  ? currentUrl
                       : isTunnel(cfUrl)       ? cfUrl : '';
    this._wifiUrl      = isLocalIP(savedUrl)   ? savedUrl
                       : isLocalIP(currentUrl) ? currentUrl : '';

    // Wi-Fi IP가 없고 현재 주소도 localhost이면 → WebRTC로 실제 IP 감지
    if (!this._wifiUrl && isLocalhost(currentUrl)) {
      const detectedIP = await this._detectLocalIP();
      if (detectedIP) {
        this._wifiUrl = `http://${detectedIP}:${port}/`;
      }
    }

    // QR에 표시할 주소: Tailscale(최우선) > 터널 > Wi-Fi > 현재
    const displayUrl = this._tailscaleUrl || this._tunnelUrl || this._wifiUrl || currentUrl;
    this._appUrl = displayUrl;

    // ── QR 코드 생성 ────────────────────────────────────────
    qrWrap.innerHTML = '';
    try {
      const qr = qrcode(0, 'M');
      qr.addData(displayUrl);
      qr.make();
      const { cell, margin } = this._qrCellSize();
      const count = qr.getModuleCount();
      const size  = count * cell + margin * 2;
      let rects = '';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c))
            rects += `<rect x="${c*cell+margin}" y="${r*cell+margin}" width="${cell}" height="${cell}" fill="#0d47a1"/>`;
        }
      }
      qrWrap.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="border-radius:10px;display:block">` +
        `<rect width="${size}" height="${size}" fill="#fff" rx="10"/>${rects}</svg>`;
    } catch {
      qrWrap.innerHTML = '<p style="color:#d93025;font-size:12px;padding:20px">QR 생성 실패</p>';
    }

    document.getElementById('qr-url-text').textContent = displayUrl;

    // ── 접속 정보 렌더 ──────────────────────────────────────
    document.getElementById('qr-ip-list').innerHTML = this._buildInfoHtml(false);

    // 힌트
    const hintEl = document.querySelector('.qr-hint');
    if (this._tailscaleUrl) {
      hintEl.style.color = '';
      hintEl.textContent = '✅ Tailscale — 어디서나 안정적으로 접속 가능';
    } else if (this._tunnelUrl) {
      hintEl.style.color = '';
      hintEl.textContent = '📶 모바일 데이터에서도 스캔 가능합니다';
    } else if (this._wifiUrl) {
      hintEl.style.color = '';
      hintEl.textContent = '📶 같은 Wi-Fi에서 스캔하세요 (두 기기 동일 와이파이 필수)';
    } else {
      hintEl.style.color = '#d93025';
      hintEl.textContent = '⚠️ start.ps1을 실행해야 다른 기기에서 접속 가능합니다';
    }

    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '🔄 QR 새로고침';
    }

    // Tailscale 없을 때만 터널 연결 테스트
    if (!this._tailscaleUrl && this._tunnelUrl) this._testTunnel(this._tunnelUrl);
  },

  // ── 터널 연결 실제 테스트 (fetch 5초 타임아웃) ──────────────
  async _testTunnel(url) {
    const statusEl = document.getElementById('qr-tunnel-status');
    if (!statusEl) return;
    statusEl.className = 'qr-tunnel-status testing';
    statusEl.textContent = '⏳ 연결 확인 중...';

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      // tunnel URL의 /tunnel-url.txt 를 fetch (CORS 헤더 있음)
      const res = await fetch(url.replace(/\/$/, '') + '/tunnel-url.txt?_=' + Date.now(), {
        signal: ctrl.signal, cache: 'no-store', mode: 'cors'
      });
      clearTimeout(timer);
      if (res.ok || res.status === 404) {
        statusEl.className = 'qr-tunnel-status ok';
        statusEl.textContent = '✅ 터널 연결 정상 — 스캔 후 바로 접속 가능';
      } else {
        throw new Error('status ' + res.status);
      }
    } catch (e) {
      const isAbort = e.name === 'AbortError';
      statusEl.className = 'qr-tunnel-status fail';
      statusEl.innerHTML =
        (isAbort ? '⏱ 응답 없음 — ' : '❌ 연결 불가 — ') +
        '<b>PC에서 start.ps1 재시작 후 QR 새로고침</b>';
      // Wi-Fi URL로 QR 전환
      if (this._wifiUrl) this._switchToWifi();
    }
  },

  // ── Wi-Fi URL로 QR 전환 ────────────────────────────────────
  _switchToWifi() {
    if (!this._wifiUrl) return;
    this._appUrl = this._wifiUrl;
    const qrWrap = document.getElementById('qr-code-img');
    try {
      const qr = qrcode(0, 'M');
      qr.addData(this._wifiUrl);
      qr.make();
      const { cell, margin } = this._qrCellSize();
      const count = qr.getModuleCount();
      const size  = count * cell + margin * 2;
      let rects = '';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c))
            rects += `<rect x="${c*cell+margin}" y="${r*cell+margin}" width="${cell}" height="${cell}" fill="#1e8e3e"/>`;
        }
      }
      qrWrap.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="border-radius:10px;display:block">` +
        `<rect width="${size}" height="${size}" fill="#fff" rx="10"/>${rects}</svg>`;
      document.getElementById('qr-url-text').textContent = this._wifiUrl;
      document.querySelector('.qr-hint').textContent = '📶 같은 Wi-Fi에서 스캔하세요';
    } catch {}
  },

  // ── 접속 정보 HTML 생성 ──────────────────────────────────────
  _buildInfoHtml(tunnelOk) {
    const localUrl = `http://localhost${location.port ? ':' + location.port : ''}/`;
    let html = '';

    // ① Tailscale (최우선 — 항상 안정, DNS 오류 없음)
    if (this._tailscaleUrl) {
      html += `
        <div class="qr-ip-item qr-ip-tailscale">
          <div class="qr-ip-label-row">
            <span class="qr-ip-label">🛡 Tailscale — <b>DNS 오류 없음 · 항상 안정</b></span>
            <span class="qr-tunnel-status ok">✅ 권장</span>
          </div>
          <strong class="qr-ip-value">${this._tailscaleUrl}</strong>
        </div>`;
    } else {
      // Tailscale 미설치 안내
      html += `
        <div class="qr-ip-item qr-ip-tailscale-tip">
          <span class="qr-ip-label">💡 <b>Tailscale</b> 설치 시 DNS 오류 영구 해결</span>
          <span class="qr-ip-value" style="font-weight:400;color:#555">
            tailscale.com/download → PC·폰 동일 계정 로그인 → DNS 오류 없이 모바일 데이터 접속
          </span>
        </div>`;
    }

    // ② Wi-Fi
    if (this._wifiUrl) {
      html += `
        <div class="qr-ip-item qr-ip-wifi">
          <div class="qr-ip-label-row">
            <span class="qr-ip-label">📶 같은 Wi-Fi · 사내 유선망 — <b>안정</b></span>
          </div>
          <strong class="qr-ip-value">${this._wifiUrl}</strong>
        </div>`;
    }

    // ③ 터널 (모바일 데이터용)
    if (this._tunnelUrl) {
      html += `
        <div class="qr-ip-item qr-ip-tunnel">
          <div class="qr-ip-label-row">
            <span class="qr-ip-label">🌐 모바일 데이터 · 외부망</span>
            <span id="qr-tunnel-status" class="qr-tunnel-status"></span>
          </div>
          <strong class="qr-ip-value">${this._tunnelUrl}</strong>
        </div>`;
    } else {
      html += `
        <div class="qr-ip-item qr-ip-warn">
          <span class="qr-ip-label">⚠️ 외부망(모바일 데이터) 접속 불가</span>
          <span class="qr-ip-value" style="font-weight:400;color:#e65100">
            PC에서 start.ps1 실행 시 외부 주소가 자동 생성됩니다
          </span>
        </div>`;
    }

    // ④ 로컬호스트
    html += `
      <div class="qr-ip-item">
        <span class="qr-ip-label">💻 이 PC에서만</span>
        <strong class="qr-ip-value">${localUrl}</strong>
      </div>`;

    // ⑤ DNS 오류 해결 가이드
    html += `
      <div class="qr-ip-info-box">
        <div class="qr-ip-info-title">📡 "DNS 주소 연결 불가" 오류 해결</div>
        <ol class="qr-ip-info-steps">
          <li>PC에서 <b>start.ps1 재시작</b> (터널 URL 갱신)</li>
          <li>앱 QR 버튼 → <b>🔄 QR 새로고침</b> 탭</li>
          <li><b>새 QR 코드 스캔</b> 또는 Wi-Fi 주소로 접속</li>
        </ol>
        <div class="qr-wifi-tip">
          💡 <b>Wi-Fi 주소</b>는 항상 안정적입니다<br>
          같은 Wi-Fi라면 DNS 오류 없이 바로 접속됩니다
        </div>
      </div>`;

    return html;
  },

  close(event) {
    if (event && event.target !== document.getElementById('qr-modal')) return;
    const modal = document.getElementById('qr-modal');
    modal.classList.remove('qr-modal-visible');
    setTimeout(() => modal.classList.add('hidden'), 220);
  },

  async copyUrl() {
    if (!this._appUrl) return;
    try {
      await navigator.clipboard.writeText(this._appUrl);
      App.showToast('URL이 복사됐습니다 📋');
    } catch { App.showToast(this._appUrl); }
  },

  async shareUrl() {
    const url = this._appUrl;
    if (!url) { App.showToast('주소를 불러오는 중입니다'); return; }
    const shareText =
      `📱 SAMHWA SafeOn 안전관리 앱\n\n` +
      `아래 주소로 접속하세요:\n${url}\n\n` +
      `※ QR코드 스캔 또는 주소 직접 입력`;
    if (navigator.share) {
      try { await navigator.share({ title: 'SAMHWA SafeOn', text: shareText, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      App.showToast('앱 주소가 복사됐습니다 📋');
    } catch { App.showToast(url); }
  }
};
