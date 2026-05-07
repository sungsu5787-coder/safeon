// ===== TBM i18n 번역 테이블 =====
const TBM_I18N = {
  ko: {
    'work-date':       '작업일자',
    'work-name':       '공종/작업명',
    'work-name-ph':    '예: 철골 용접 작업',
    'location':        '작업장소',
    'location-ph':     '예: A동 3층',
    'workers':         '작업인원',
    'workers-ph':      '인원 수',
    'content':         '작업내용',
    'content-ph':      '오늘의 작업 내용을 입력하세요',
    'hazards':         '위험요인',
    'hazards-ph':      '예상되는 위험요인을 입력하세요',
    'measures':        '안전대책',
    'measures-ph':     '안전대책을 입력하세요',
    'instructions':    '특별 지시사항',
    'instructions-ph': '추가 지시사항 (선택)',
    'participants':    '참석자',
    'participant-ph':  '이름',
    'add-btn':         '추가',
    'supervisor':      '관리감독자',
    'supervisor-ph':   '관리감독자 성명',
    'photos-title':    '📷 현장사진 첨부',
    'photos-upload':   '사진을 추가하려면 탭하세요',
    'photos-desc':     '최대 10장 · 각 10MB 이하 · JPG / PNG',
    'submit':          'TBM 저장',
    // 토스트/메시지
    'toast-saved':     'TBM이 저장되었습니다 ✓',
    'toast-error':     '저장 중 오류가 발생했습니다',
    'toast-fill':      '필수 항목을 입력하세요',
    'confirm-title':   'TBM을 저장하시겠습니까?',
    'already-added':   '이미 추가된 참석자입니다',
    'img-only':        '이미지 파일만 가능합니다',
    'size-limit':      '10MB 이하만 첨부 가능합니다',
    'max-photos':      '사진은 최대 10장까지 첨부 가능합니다',
    'photo-removed':   '사진이 삭제되었습니다',
    'photo-added':     (n, total) => `📷 사진 ${n}장 추가 (총 ${total}장)`,
    'confirm-body':    (name, date, photos) => `<b>${name}</b><br>${date}${photos}`,
    'photo-count':     (n) => ` · 사진 ${n}장`,
    'saved-with-photo':(n) => `✅ TBM이 저장되었습니다 (사진 ${n}장 포함)`,
  },
  zh: {
    'work-date':       '工作日期',
    'work-name':       '工种 / 作业名称',
    'work-name-ph':    '例: 钢结构焊接作业',
    'location':        '作业地点',
    'location-ph':     '例: A? 3?',
    'workers':         '作业人数',
    'workers-ph':      '人数',
    'content':         '作业内容',
    'content-ph':      '请输入今天的作业内容',
    'hazards':         '危险因素',
    'hazards-ph':      '请输入预期的危险因素',
    'measures':        '安全措施',
    'measures-ph':     '请输入安全措施',
    'instructions':    '特别指示',
    'instructions-ph': '追加指示事项 (??)',
    'participants':    '参与者',
    'participant-ph':  '姓名',
    'add-btn':         '添加',
    'supervisor':      '管理负责人',
    'supervisor-ph':   '负责人姓名',
    'photos-title':    '📷 现场照片',
    'photos-upload':   '点击添加照片',
    'photos-desc':     '最多10? · 每张10MB以下 · JPG / PNG',
    'submit':          '保存 TBM',
    'toast-saved':     'TBM 已保存 ✓',
    'toast-error':     '保存时发生错误',
    'toast-fill':      '请填写必填项目',
    'confirm-title':   '确认保存 TBM?',
    'already-added':   '该参与者已添加',
    'img-only':        '只能附加图片文件',
    'size-limit':      '只能附加10MB以下的文件',
    'max-photos':      '最多只能附加10张照片',
    'photo-removed':   '已删除照片',
    'photo-added':     (n, total) => `📷 已添加 ${n} ? (共 ${total} ?)`,
    'confirm-body':    (name, date, photos) => `<b>${name}</b><br>${date}${photos}`,
    'photo-count':     (n) => ` · ${n}张照片`,
    'saved-with-photo':(n) => `✅ TBM 已保存 (含 ${n} 张照片)`,
  },
  vi: {
    'work-date':       'Ngày làm việc',
    'work-name':       'Loại / Tên công việc',
    'work-name-ph':    'VD: Hàn khung thép',
    'location':        'Địa điểm',
    'location-ph':     'VD: Tòa A, tầng 3',
    'workers':         'Số công nhân',
    'workers-ph':      'Số người',
    'content':         'Nội dung công việc',
    'content-ph':      'Nhập nội dung công việc hôm nay',
    'hazards':         'Yếu tố nguy hiểm',
    'hazards-ph':      'Nhập các yếu tố nguy hiểm dự kiến',
    'measures':        'Biện pháp an toàn',
    'measures-ph':     'Nhập biện pháp an toàn',
    'instructions':    'Chỉ dẫn đặc biệt',
    'instructions-ph': 'Chỉ dẫn bổ sung (tùy chọn)',
    'participants':    'Người tham gia',
    'participant-ph':  'Họ tên',
    'add-btn':         'Thêm',
    'supervisor':      'Người giám sát',
    'supervisor-ph':   'Tên người giám sát',
    'photos-title':    '📷 Ảnh hiện trường',
    'photos-upload':   'Nhấn để thêm ảnh',
    'photos-desc':     'Tối đa 10 ảnh · Dưới 10MB mỗi ảnh · JPG / PNG',
    'submit':          'Lưu TBM',
    'toast-saved':     'TBM đã được lưu ✓',
    'toast-error':     'Lỗi khi lưu dữ liệu',
    'toast-fill':      'Vui lòng điền đầy đủ thông tin',
    'confirm-title':   'Lưu TBM?',
    'already-added':   'Người này đã được thêm',
    'img-only':        'Chỉ đính kèm file ảnh',
    'size-limit':      'Chỉ đính kèm file dưới 10MB',
    'max-photos':      'Tối đa 10 ảnh',
    'photo-removed':   'Đã xóa ảnh',
    'photo-added':     (n, total) => `📷 Đã thêm ${n} ảnh (tổng ${total})`,
    'confirm-body':    (name, date, photos) => `<b>${name}</b><br>${date}${photos}`,
    'photo-count':     (n) => ` · ${n} ảnh`,
    'saved-with-photo':(n) => `✅ TBM đã lưu (${n} ảnh)`,
  },
  en: {
    'work-date':       'Work Date',
    'work-name':       'Work Type / Task Name',
    'work-name-ph':    'e.g. Steel frame welding',
    'location':        'Work Location',
    'location-ph':     'e.g. Building A, 3F',
    'workers':         'No. of Workers',
    'workers-ph':      'Number of workers',
    'content':         'Work Content',
    'content-ph':      "Enter today's work content",
    'hazards':         'Hazards',
    'hazards-ph':      'Enter anticipated hazards',
    'measures':        'Safety Measures',
    'measures-ph':     'Enter safety measures',
    'instructions':    'Special Instructions',
    'instructions-ph': 'Additional instructions (optional)',
    'participants':    'Participants',
    'participant-ph':  'Name',
    'add-btn':         'Add',
    'supervisor':      'Supervisor',
    'supervisor-ph':   'Supervisor name',
    'photos-title':    '📷 Site Photos',
    'photos-upload':   'Tap to add photos',
    'photos-desc':     'Up to 10 photos · Max 10MB each · JPG / PNG',
    'submit':          'Save TBM',
    'toast-saved':     'TBM saved ✓',
    'toast-error':     'Error saving TBM',
    'toast-fill':      'Please fill in required fields',
    'confirm-title':   'Save TBM?',
    'already-added':   'Participant already added',
    'img-only':        'Image files only',
    'size-limit':      'File must be under 10MB',
    'max-photos':      'Maximum 10 photos allowed',
    'photo-removed':   'Photo removed',
    'photo-added':     (n, total) => `📷 ${n} photo(s) added (total ${total})`,
    'confirm-body':    (name, date, photos) => `<b>${name}</b><br>${date}${photos}`,
    'photo-count':     (n) => ` · ${n} photo(s)`,
    'saved-with-photo':(n) => `✅ TBM saved (${n} photo(s))`,
  }
};

// ===== TBM Module =====
const TBM = {
  participants: [],
  photos: [],
  _lang: localStorage.getItem('tbm_lang') || 'ko',

  // ── 재해유형별 안전대책 DB ────────────────────────────────
  disasterTypeDB: {
    끼임: {
      label: '끼임·협착', icon: '⚙️',
      본질적: ['위험 공정 자동화·무인화','방호장치 내장형 설비 도입'],
      공학적: ['방호덮개·가드 설치','인터록 장치 설치','비상정지 스위치 설치','안전거리 확보'],
      행정적: ['LOTO(에너지 차단·잠금) 절차 이행','작업 전 설비 안전 점검','협착 위험 작업 허가제 운영'],
      보호구: ['몸에 밀착된 작업복 착용','안전화 착용','안전장갑 착용 (회전부 주의)']
    },
    떨어짐: {
      label: '떨어짐·추락', icon: '⬇️',
      본질적: ['고소작업 최소화 (지상 공법 전환)','프리패브·모듈러 공법 적용'],
      공학적: ['안전난간 설치 (H≥90cm·중간대·발끝막이)','추락방지망 설치','개구부 안전덮개 고정','이동식 비계·작업대 사용'],
      행정적: ['고소작업 허가제 운영','TBM 시 추락위험 공유','2인 1조 작업 원칙','작업 전 발판·난간 상태 점검'],
      보호구: ['전체식 안전대 착용 (D링 상부 체결)','안전모 착용 (턱끈 체결)','안전화 착용 (미끄럼 방지)']
    },
    부딪힘: {
      label: '부딪힘·충돌', icon: '💥',
      본질적: ['장비 동선과 보행자 동선 완전 분리','무선 경보 시스템 도입'],
      공학적: ['안전 울타리·방호벽 설치','경고등·경광등 설치','반사재·시인성 표지 부착','제한속도 표지 설치'],
      행정적: ['장비 작업 반경 내 근로자 접근 금지','신호수 배치','TBM 시 충돌 위험 공유','후방 카메라·경보 장치 확인'],
      보호구: ['안전모 착용','형광 안전조끼 착용','안전화 착용']
    },
    물체에맞음: {
      label: '물체에 맞음·낙하', icon: '🪨',
      본질적: ['상부 작업 최소화','하부 동시 작업 금지 원칙 수립'],
      공학적: ['낙하물 방지망 설치','수직 보호망 설치','발끝막이판 설치 (H≥10cm)','공구·자재 안전줄 사용'],
      행정적: ['낙하위험구역 출입 통제','낙하물 방지 표지 설치','자재 적치 불량 즉시 시정'],
      보호구: ['안전모 착용 (내관통형)','보안면 착용','안전조끼 착용']
    },
    화재폭발: {
      label: '화재·폭발', icon: '🔥',
      본질적: ['화기작업 최소화 (볼트·체결 공법 전환)','불연성 자재 사용','인화성 물질 격리 보관'],
      공학적: ['불꽃 비산방지 커버 설치','소화기 비치 (반경 5m 이내)','역화방지기 설치','방화격벽 설치'],
      행정적: ['화기작업 허가제 운영','화재감시자 배치','가연물 사전 제거','화기 작업 후 30분 잔불 확인'],
      보호구: ['방염복 착용','용접용 보안면 착용','용접장갑 착용','방진마스크(흄) 착용']
    },
    전도: {
      label: '전도·미끄러짐', icon: '🚶',
      본질적: ['미끄럼 방지 바닥재 시공','통로 경사 완화 설계 (15° 이하)'],
      공학적: ['미끄럼 방지 테이프 부착','배수로 설치 (물기 제거)','적정 조도 확보 (150lux↑)','손잡이·핸드레일 설치'],
      행정적: ['통로 정리정돈 유지 (5S)','위험구역 표지판 설치','청소 후 "미끄럼 주의" 표지'],
      보호구: ['안전화 착용 (미끄럼 방지 밑창)','안전조끼 착용']
    },
    감전: {
      label: '감전', icon: '⚡',
      본질적: ['저전압 설비 전환','절연형·봉함형 설비 도입','활선 작업 금지 원칙'],
      공학적: ['누전차단기 설치','보호 접지 설비 설치','절연 방호구·방호관 비치','전선 절연 피복 유지'],
      행정적: ['전기작업 허가제 운영','정전 작업 원칙 (LOTO)','전기작업 자격자 배치'],
      보호구: ['절연장갑 착용 (등급 확인)','절연화 착용','절연 안전모 착용','보안면 착용']
    },
    근골격계질환: {
      label: '근골격계질환', icon: '🦴',
      본질적: ['중량물 경량화 설계','기계화 운반 시스템 도입','조립 단위 소형화'],
      공학적: ['크레인·호이스트 설치','컨베이어·전동카 사용','진공흡착기·자석 리프터 활용'],
      행정적: ['인력운반 중량 제한 준수 (남 25kg·여 15kg)','올바른 작업자세 교육 실시','충분한 휴식 시간 부여'],
      보호구: ['안전화 착용 (발 압착 방지)','허리보호대 착용','안전장갑 착용']
    },
    기타: {
      label: '기타', icon: '⚠️',
      본질적: ['위험 원천 제거 또는 안전한 공법으로 대체 검토'],
      공학적: ['방호장치·안전설비 설치 검토','비상정지 장치 설치'],
      행정적: ['TBM 시 위험요인 공유 및 작업 전 안전점검','작업절차서(SOP) 수립 및 교육'],
      보호구: ['작업 특성에 맞는 보호구 착용 의무화']
    }
  },

  _TIER_MAP: {
    본질적: { label:'① 본질적 대책', cls:'prev-tier-1', icon:'🔴', desc:'제거·대체(최우선)' },
    공학적: { label:'② 공학적 대책', cls:'prev-tier-2', icon:'🟠', desc:'설비·환경 개선'    },
    행정적: { label:'③ 행정적 대책', cls:'prev-tier-3', icon:'🟢', desc:'절차·교육·관리'    },
    보호구: { label:'④ 보호구 착용', cls:'prev-tier-4', icon:'🔵', desc:'마지막 수단'       }
  },

  // ── AI 안전대책 추천 모달 ─────────────────────────────────
  openModal() {
    const checked = [...document.querySelectorAll('input[name="tbm-disaster"]:checked')]
                      .map(cb => cb.value);
    const container = document.getElementById('tbm-suggest-categories');
    if (!container) return;

    const merged = { 본질적: new Set(), 공학적: new Set(), 행정적: new Set(), 보호구: new Set() };
    const hitLabels = [];

    if (checked.length) {
      checked.forEach(type => {
        const db = this.disasterTypeDB[type];
        if (!db) return;
        hitLabels.push(`${db.icon} ${db.label}`);
        ['본질적','공학적','행정적','보호구'].forEach(lv => (db[lv] || []).forEach(i => merged[lv].add(i)));
      });
    } else {
      merged.본질적.add('위험 원천 제거 또는 안전한 공법으로 대체 검토');
      merged.공학적.add('방호장치·안전설비 설치 검토');
      merged.행정적.add('TBM 시 위험요인 공유 및 작업 전 안전점검');
      merged.보호구.add('작업 특성에 맞는 보호구 착용 의무화');
    }

    let html = '';
    if (hitLabels.length) {
      html += `<div style="font-size:11px;color:var(--primary);font-weight:700;padding:4px 2px 8px">🎯 선택된 재해유형: ${hitLabels.join(', ')}</div>`;
    } else {
      html += `<div style="font-size:11px;color:var(--gray-500);padding:4px 2px 8px">⚠️ 재해유형을 선택하면 맞춤 안전대책이 제안됩니다</div>`;
    }

    ['본질적','공학적','행정적','보호구'].forEach((key, idx) => {
      const items = [...merged[key]];
      if (!items.length) return;
      const t = this._TIER_MAP[key];
      html += `<div class="prev-tier ${t.cls}">
        <div class="prev-tier-header">${t.icon} ${t.label}<span class="prev-tier-badge">${t.desc}</span></div>
        <div class="prev-items">`;
      items.forEach((item, i) => {
        const cbId = `tbm_prev_${idx}_${i}`;
        html += `<label class="prev-item" for="${cbId}">
          <input type="checkbox" id="${cbId}" value="${App.escapeHtml(item)}"
                 onchange="this.closest('.prev-item').classList.toggle('checked', this.checked)">
          <span class="prev-item-text">${App.escapeHtml(item)}</span>
        </label>`;
      });
      html += `</div></div>`;
    });

    html += `<div class="prev-source">📚 출처: 산업안전보건기준에 관한 규칙(2026) · KOSHA GUIDE · 사업장 위험성평가 지침</div>`;

    container.innerHTML = html;
    document.getElementById('tbm-suggest-modal').classList.remove('hidden');
  },

  applyMeasures() {
    const checked = document.querySelectorAll('#tbm-suggest-categories input[type="checkbox"]:checked');
    if (!checked.length) { App.showToast('항목을 하나 이상 선택하세요'); return; }

    const tierLabels = ['① 본질적 대책','② 공학적 대책','③ 행정적 대책','④ 보호구 착용'];
    const byTier = {};
    tierLabels.forEach(t => { byTier[t] = []; });

    checked.forEach(cb => {
      const label  = cb.closest('.prev-item');
      const header = label.closest('.prev-tier').querySelector('.prev-tier-header');
      const tier   = tierLabels.find(t => header.textContent.includes(t)) || '';
      if (tier) byTier[tier].push(cb.value);
    });

    const lines = [];
    tierLabels.forEach(tier => {
      if (byTier[tier].length) {
        lines.push(`[${tier}]`);
        byTier[tier].forEach(item => lines.push(`• ${item}`));
      }
    });

    const ta = document.getElementById('tbm-measures');
    if (!ta) return;
    const existing = ta.value.trim();
    ta.value = existing ? existing + '\n\n' + lines.join('\n') : lines.join('\n');

    this.closeModal();
    App.showToast(`✓ ${checked.length}개 안전대책 적용 완료`);
  },

  closeModal(event) {
    if (event) {
      const overlay = document.getElementById('tbm-suggest-modal');
      if (event.target !== overlay) return;
    }
    document.getElementById('tbm-suggest-modal').classList.add('hidden');
  },

  // 번역 헬퍼
  _t(key) {
    const t = TBM_I18N[this._lang] || TBM_I18N.ko;
    return t[key] || TBM_I18N.ko[key] || key;
  },

  // 언어 전환
  setLang(lang) {
    this._lang = lang;
    localStorage.setItem('tbm_lang', lang);
    this._applyLang();
    document.querySelectorAll('.tbm-lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  },

  // DOM에 번역 적용
  _applyLang() {
    const form = document.getElementById('tbm-form');
    if (!form) return;
    const section = form.closest('.page-content') || form.parentElement;

    // data-i18n 속성이 있는 요소 텍스트 교체 (TBM 섹션 범위)
    const root = section || form;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const val = this._t(el.dataset.i18n);
      if (val) el.textContent = val;
    });

    // data-i18n-ph 속성이 있는 placeholder 교체
    root.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const val = this._t(el.dataset.i18nPh);
      if (val) el.placeholder = val;
    });

    // 사진 업로드 영역 (id로 직접 접근)
    const uploadTxt  = document.getElementById('tbm-photo-upload-txt');
    const uploadDesc = document.getElementById('tbm-photo-upload-desc');
    if (uploadTxt)  uploadTxt.textContent  = this._t('photos-upload');
    if (uploadDesc) uploadDesc.textContent = this._t('photos-desc');
  },

  init() {
    this.form = document.getElementById('tbm-form');
    this.participantsList = document.getElementById('tbm-participants');

    // 저장된 언어로 초기화
    this._applyLang();
    document.querySelectorAll('.tbm-lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this._lang);
    });

    // 참석자 추가
    document.getElementById('btn-add-participant').addEventListener('click', () => {
      this.addParticipant();
    });
    document.getElementById('tbm-participant-name').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.addParticipant(); }
    });

    // 사진 input
    const photoInput = document.getElementById('tbm-photo-input');
    if (photoInput) photoInput.addEventListener('change', e => this.handlePhotos(e));

    // 업로드 영역 클릭 → input 트리거
    const uploadArea = document.getElementById('tbm-upload-area');
    if (uploadArea) uploadArea.addEventListener('click', () => photoInput && photoInput.click());

    // Form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.save();
    });
  },

  addParticipant() {
    const input = document.getElementById('tbm-participant-name');
    const name = input.value.trim();
    if (!name) return;
    if (this.participants.includes(name)) {
      App.showToast(this._t('already-added'));
      return;
    }

    this.participants.push(name);
    this.renderParticipants();
    input.value = '';
    input.focus();
  },

  removeParticipant(name) {
    this.participants = this.participants.filter(p => p !== name);
    this.renderParticipants();
  },

  renderParticipants() {
    this.participantsList.innerHTML = this.participants.map(name => `
      <span class="participant-tag">
        ${App.escapeHtml(name)}
        <button type="button" onclick="TBM.removeParticipant('${name.replace(/'/g, "\\'")}')">&times;</button>
      </span>
    `).join('');
  },

  // ── 사진 처리 ──────────────────────────────────────────
  async handlePhotos(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        App.showToast(`${file.name}: ${this._t('img-only')}`); continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        App.showToast(`${file.name}: ${this._t('size-limit')}`); continue;
      }
      if (this.photos.length >= 10) {
        App.showToast(this._t('max-photos')); break;
      }
      try {
        const raw        = await this._fileToDataURL(file);
        const compressed = await this._compressImage(raw, 1200, 0.78);
        this.photos.push({ name: file.name, data: compressed });
        added++;
      } catch {
        App.showToast(`${file.name} 처리 실패`);
      }
    }
    e.target.value = '';
    if (added) {
      this.renderPhotoPreview();
      App.showToast(this._t('photo-added')(added, this.photos.length));
    }
  },

  _fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = ev => resolve(ev.target.result);
      r.onerror = ()  => reject(new Error('읽기 실패'));
      r.readAsDataURL(file);
    });
  },

  _compressImage(dataUrl, maxSize, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) { height = Math.round(height * maxSize / width); width = maxSize; }
          else                 { width  = Math.round(width  * maxSize / height); height = maxSize; }
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  renderPhotoPreview() {
    const container = document.getElementById('tbm-photo-preview');
    if (!container) return;
    if (!this.photos.length) { container.innerHTML = ''; return; }
    container.innerHTML = this.photos.map((p, i) => `
      <div class="photo-thumb">
        <img src="${p.data}" alt="${App.escapeHtml(p.name)}"
             onclick="TBM.viewPhoto(${i})">
        <button type="button" class="photo-remove"
                onclick="event.stopPropagation();TBM.removePhoto(${i})"
                title="삭제">×</button>
      </div>
    `).join('');
  },

  removePhoto(idx) {
    this.photos.splice(idx, 1);
    this.renderPhotoPreview();
    App.showToast(this._t('photo-removed'));
  },

  viewPhoto(idx) {
    const p = this.photos[idx];
    if (p) App._viewPhoto(p.data);
  },

  async save() {
    const workName = document.getElementById('tbm-work-name').value.trim();
    const date     = document.getElementById('tbm-date').value;
    const photoTxt = this.photos.length ? this._t('photo-count')(this.photos.length) : '';
    const ok = await App.confirm(
      this._t('confirm-body')(workName || '---', date, photoTxt),
      { type: 'save', title: this._t('confirm-title'), icon: '📋' }
    );
    if (!ok) return;

    const disasterTypes = [...document.querySelectorAll('input[name="tbm-disaster"]:checked')]
                            .map(cb => cb.value);

    const data = {
      date:          date,
      workName:      workName,
      location:      document.getElementById('tbm-location').value.trim(),
      workers:       parseInt(document.getElementById('tbm-workers').value),
      content:       document.getElementById('tbm-content').value.trim(),
      disasterTypes,
      hazards:       document.getElementById('tbm-hazards').value.trim(),
      measures:      document.getElementById('tbm-measures').value.trim(),
      instructions:  document.getElementById('tbm-instructions').value.trim(),
      participants:  [...this.participants],
      supervisor:    document.getElementById('tbm-supervisor').value.trim(),
      photos:        this.photos.map(p => p.data),
      createdAt:     new Date().toISOString()
    };

    try {
      const docRef = await collections.tbm.add(data);
      App.showToast(this.photos.length
        ? this._t('saved-with-photo')(this.photos.length)
        : this._t('toast-saved'));
      this.resetForm();
      App.updateDashboard();
      setTimeout(() => TBM.openShareQR(docRef.id), 600);
    } catch (err) {
      App.showToast(this._t('toast-error'));
      console.error(err);
    }
  },

  resetForm() {
    this.form.reset();
    this.participants = [];
    this.photos       = [];
    this.renderParticipants();
    const prev = document.getElementById('tbm-photo-preview');
    if (prev) prev.innerHTML = '';
    document.getElementById('tbm-date').value = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[name="tbm-disaster"]').forEach(cb => { cb.checked = false; });
  },

  // ── TBM 공유 QR ──────────────────────────────────────────
  _shareDocId: null,
  _shareLang: 'ko',
  _shareUrl: '',

  openShareQR(docId) {
    this._shareDocId = docId;
    this._shareLang  = this._lang;
    document.getElementById('tbm-share-modal').classList.remove('hidden');
    this._buildShareQR();
  },

  _getShareBase() {
    const base = (QRModal._tailscaleUrl || QRModal._tunnelUrl || QRModal._wifiUrl || '').replace(/\/$/, '');
    if (base) return base;
    const href = location.href.split('?')[0].split('#')[0];
    return href.replace(/\/index\.html$/, '').replace(/\/$/, '');
  },

  _buildShareQR() {
    const url = `${this._getShareBase()}/?guest=1&mode=tbm-view&id=${this._shareDocId}&lang=${this._shareLang}`;
    this._shareUrl = url;

    document.querySelectorAll('.tbm-share-lang-tab').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.lang === this._shareLang)
    );

    const wrap = document.getElementById('tbm-share-qr-wrap');
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      const cell = 5, margin = 16;
      const count = qr.getModuleCount();
      const size  = count * cell + margin * 2;
      let rects = '';
      for (let r = 0; r < count; r++)
        for (let c = 0; c < count; c++)
          if (qr.isDark(r, c))
            rects += `<rect x="${c*cell+margin}" y="${r*cell+margin}" width="${cell}" height="${cell}" fill="#1a237e"/>`;
      wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="border-radius:12px;display:block;margin:0 auto"><rect width="${size}" height="${size}" fill="#fff" rx="12"/>${rects}</svg>`;
    } catch {
      wrap.innerHTML = '<p style="color:#d93025;text-align:center;padding:16px">QR 생성 실패</p>';
    }

    const urlEl = document.getElementById('tbm-share-url-text');
    if (urlEl) urlEl.textContent = url;
  },

  switchShareLang(lang) {
    this._shareLang = lang;
    this._buildShareQR();
  },

  closeShareModal(event) {
    if (event && event.target !== document.getElementById('tbm-share-modal')) return;
    document.getElementById('tbm-share-modal').classList.add('hidden');
  },

  downloadShareQR() {
    const svg = document.querySelector('#tbm-share-qr-wrap svg');
    if (!svg) return;
    const names = { ko:'한국어', zh:'中文', vi:'Tieng-Viet', en:'English' };
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.download = `TBM-QR-${names[this._shareLang] || this._shareLang}.svg`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    App.showToast('QR 저장 완료 💾');
  },

  async copyShareUrl() {
    if (!this._shareUrl) return;
    try {
      await navigator.clipboard.writeText(this._shareUrl);
      App.showToast('URL 복사됐습니다 📋');
    } catch {
      window.prompt('아래 URL을 복사하세요', this._shareUrl);
    }
  },

  async webShareUrl() {
    if (!this._shareUrl) return;
    const names = { ko:'한국어', zh:'中文', vi:'Tiếng Việt', en:'English' };
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TBM 공유', text: `SafeOn TBM (${names[this._shareLang]})`, url: this._shareUrl });
        return;
      } catch {}
    }
    this.copyShareUrl();
  },

  // ── TBM 공유 뷰어 ─────────────────────────────────────────
  _viewData: null,
  _viewId:   null,
  _VIEWER_UNITS: { ko: '명', zh: '人', vi: 'người', en: '' },
  _DISASTER_LABELS: {
    ko: { 끼임:'끼임', 떨어짐:'떨어짐', 부딪힘:'부딪힘', 물체에맞음:'물체에맞음', 화재폭발:'화재·폭발', 전도:'전도', 감전:'감전', 근골격계질환:'근골격계', 기타:'기타' },
    zh: { 끼임:'夹伤', 떨어짐:'坠落', 부딪힘:'碰撞', 물체에맞음:'落物打击', 화재폭발:'火灾·爆炸', 전도:'跌倒', 감전:'触电', 근골격계질환:'肌肉骨骼', 기타:'其他' },
    vi: { 끼임:'Kẹt tay', 떨어짐:'Té ngã', 부딪힘:'Va chạm', 물체에맞음:'Vật rơi', 화재폭발:'Cháy·Nổ', 전도:'Trượt ngã', 감전:'Điện giật', 근골격계질환:'Cơ xương', 기타:'Khác' },
    en: { 끼임:'Pinch', 떨어짐:'Fall', 부딪힘:'Collision', 물체에맞음:'Falling object', 화재폭발:'Fire/Explosion', 전도:'Slip/Trip', 감전:'Electric shock', 근골격계질환:'Musculoskeletal', 기타:'Other' }
  },
  _HAZARD_LABEL: { ko:'재해유형', zh:'事故类型', vi:'Loại tai nạn', en:'Hazard Type' },

  async initSharedView(id, lang) {
    this._viewId = id;
    const viewer = document.getElementById('tbm-shared-viewer');
    if (viewer) viewer.classList.remove('hidden');

    try {
      const doc = await collections.tbm.doc(id).get();
      if (!doc.exists) {
        document.getElementById('tbm-viewer-body').innerHTML =
          '<p style="padding:40px;text-align:center;color:#999">TBM 데이터를 찾을 수 없습니다.</p>';
        return;
      }
      this._viewData = doc.data();
      this._renderSharedView(lang);
    } catch (err) {
      document.getElementById('tbm-viewer-body').innerHTML =
        '<p style="padding:40px;text-align:center;color:#999">데이터를 불러오는 중 오류가 발생했습니다.</p>';
      console.error(err);
    }
  },

  switchViewerLang(lang) {
    if (this._viewData) this._renderSharedView(lang);
  },

  _renderSharedView(lang) {
    const t   = TBM_I18N[lang] || TBM_I18N.ko;
    const d   = this._viewData;
    const esc = s => App.escapeHtml(s || '');
    const unit = this._VIEWER_UNITS[lang] || '';
    const dtMap = this._DISASTER_LABELS[lang] || this._DISASTER_LABELS.ko;

    document.querySelectorAll('.tbm-viewer-lang-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.lang === lang)
    );

    const parts = (d.participants || [])
      .map(p => `<span class="tbm-viewer-chip">${esc(p)}</span>`).join('');

    const dtChips = (d.disasterTypes || [])
      .map(k => `<span class="tbm-viewer-chip">${dtMap[k] || k}</span>`).join('');

    const photos = (d.photos || []).length
      ? `<div class="tbm-viewer-photos">${(d.photos || []).map((p, i) =>
          `<img class="tbm-viewer-photo" src="${p}" alt="photo ${i+1}"
                onclick="App._viewPhoto('${p}')" loading="lazy">`
        ).join('')}</div>`
      : '';

    document.getElementById('tbm-viewer-body').innerHTML = `
      <div class="tbm-viewer-field">
        <div class="tvf-label">📅 ${t['work-date']}</div>
        <div class="tvf-value">${esc(d.date)}</div>
      </div>
      <div class="tbm-viewer-field">
        <div class="tvf-label">🔧 ${t['work-name']}</div>
        <div class="tvf-value">${esc(d.workName)}</div>
      </div>
      <div class="tbm-viewer-row2">
        <div class="tbm-viewer-field">
          <div class="tvf-label">📍 ${t['location']}</div>
          <div class="tvf-value">${esc(d.location)}</div>
        </div>
        <div class="tbm-viewer-field">
          <div class="tvf-label">👷 ${t['workers']}</div>
          <div class="tvf-value">${d.workers || '-'}${unit ? ' ' + unit : ''}</div>
        </div>
      </div>
      <div class="tbm-viewer-field">
        <div class="tvf-label">📋 ${t['content']}</div>
        <div class="tvf-value tvf-multi">${esc(d.content)}</div>
      </div>
      ${dtChips ? `<div class="tbm-viewer-field">
        <div class="tvf-label">🎯 ${this._HAZARD_LABEL[lang] || '재해유형'}</div>
        <div class="tvf-value">${dtChips}</div>
      </div>` : ''}
      <div class="tbm-viewer-field">
        <div class="tvf-label">⚠️ ${t['hazards']}</div>
        <div class="tvf-value tvf-multi">${esc(d.hazards)}</div>
      </div>
      <div class="tbm-viewer-field">
        <div class="tvf-label">🛡️ ${t['measures']}</div>
        <div class="tvf-value tvf-multi">${esc(d.measures)}</div>
      </div>
      ${d.instructions ? `<div class="tbm-viewer-field">
        <div class="tvf-label">📣 ${t['instructions']}</div>
        <div class="tvf-value tvf-multi">${esc(d.instructions)}</div>
      </div>` : ''}
      <div class="tbm-viewer-field">
        <div class="tvf-label">👥 ${t['participants']}</div>
        <div class="tvf-value">${parts || '<span style="color:#bbb">-</span>'}</div>
      </div>
      <div class="tbm-viewer-field">
        <div class="tvf-label">👔 ${t['supervisor']}</div>
        <div class="tvf-value">${esc(d.supervisor)}</div>
      </div>
      ${photos ? `<div class="tbm-viewer-field">
        <div class="tvf-label">📷 ${t['photos-title'] || '현장사진'}</div>
        ${photos}
      </div>` : ''}
    `;
  }
};
